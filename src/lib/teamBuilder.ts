import { MAX_STARS, WILDCARD_SPECIES, type TeamPreset } from "@/config/teamPresets";
import { bestAttackLevel, EFFECT_MULTIPLIER, weaknessProfile, type AttackOption, type EffectLevel, type WeaknessProfile } from "@/lib/effectiveness";
import type { PokedexEntry } from "@/types/pokedex";
import type { PokemonType, Tier } from "@/types/pokemon";

export const TEAM_SIZE = 6;

export type Candidate = {
  entry: PokedexEntry;
  /** Tipo ofensivo que bate o alvo e o nível que ele alcança. */
  attackType: PokemonType;
  level: EffectLevel;
  /** `true` = atinge a efetividade ideal para este alvo (2x, ou 1.5x quando o alvo não tem acerto duplo). */
  isFull: boolean;
  /** `true` = veio de um tier de reforço (fora do tipo de time escolhido). */
  isFallback: boolean;
  /** Estrelas assumidas para este Pokémon neste tipo de time (0 = sem estrelas). */
  stars: number;
  /** Prioridade dentro do tipo de time (maior = preferido). */
  priority: number;
  /** `true` = pode usar qualquer tipo (ex.: Smeargle). O tipo final é escolhido ao montar o time. */
  wildcard: boolean;
  /** `true` = entrou por regra especial do tipo de time (fora dos tiers dele). */
  isExtra: boolean;
  /** `true` = é o próprio alvo da caça: o Pokémon que você já tem caça o que está solto no mapa. */
  isTarget: boolean;
};

export type TeamResult = {
  members: Candidate[];
  /** Quantos Pokémon faltaram para completar os 6 (não existem efetivos suficientes nesse tipo de time). */
  missing: number;
};

export type MonoOption = { type: PokemonType; level: EffectLevel; full: boolean; count: number };

export type TeamBuild = {
  profile: WeaknessProfile;
  /** Todos os Pokémon do tipo de time que batem o alvo, já ordenados por prioridade. */
  candidates: Candidate[];
  teams: TeamResult[];
};

export type BuildOptions = {
  count?: number;
  round?: number;
  includeFallback?: boolean;
  /**
   * Restringe os tipos de ataque do time. 1 tipo = time de tipo único; 2 ou mais = só esses tipos
   * (ex.: Dark + Ghost). Vazio = qualquer tipo que bata o alvo. Coringas assumem um dos tipos escolhidos.
   */
  onlyTypes?: PokemonType[];
  /** Lista de Pokémon úteis (IDs). Com pelo menos 1, só eles podem entrar no time. Vazia ou ausente = sem restrição. */
  pool?: ReadonlySet<string>;
  /** Permite o próprio alvo como membro do time (ele caça ele mesmo). Só entra se bater a efetividade contra si mesmo. */
  includeTarget?: boolean;
};

/** Identifica a espécie sem a variante, para não repetir o mesmo Pokémon (normal, Shiny, Mega) no time. */
const speciesKey = (e: PokedexEntry) => e.pokemon.name.toLowerCase();
const isWildcardSpecies = (e: PokedexEntry) => WILDCARD_SPECIES.includes(speciesKey(e));

/** Gerador pseudoaleatório determinístico (mesma semente → mesmo time). */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Todos os Pokémon que entram no tipo de time e batem o alvo (sem restrição de tipo único). */
export function listCandidates(
  entries: PokedexEntry[],
  target: PokedexEntry,
  preset: TeamPreset,
  includeFallback = true,
  pool?: ReadonlySet<string>,
  includeTarget = false,
): { profile: WeaknessProfile; candidates: Candidate[] } {
  const onlyPool = pool && pool.size > 0 ? pool : null;
  const defenders = target.originalTypes ?? [];
  const profile = weaknessProfile(defenders);
  const mainRules = new Map<Tier, { priority: number; stars?: number }>(preset.tiers.map((t) => [t.tier, t]));
  const fallbackRules = new Map<Tier, { priority: number; stars?: number }>(includeFallback ? (preset.fallback ?? []).map((t) => [t.tier, t]) : []);
  const extras = new Map((preset.extras ?? []).map((x) => [x.id, x]));
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const { pokemon: p } = entry;
    const isTarget = p.id === target.pokemon.id;
    if ((isTarget && !includeTarget) || seen.has(p.id)) continue;
    if (onlyPool && !onlyPool.has(p.id)) continue; // fora da lista de úteis

    const extra = extras.get(p.id);
    const main = p.tier ? mainRules.get(p.tier) : undefined;
    const fb = p.tier && !main ? fallbackRules.get(p.tier) : undefined;
    const rule = extra ?? main ?? fb;
    if (!rule) continue;

    const wildcard = isWildcardSpecies(entry);
    let hit: { level: EffectLevel; type: PokemonType } | null;
    if (wildcard) {
      // Coringa: qualquer tipo. Começa pelo melhor tipo contra o alvo; o tipo final é definido no time.
      const first = profile.attacks[0];
      hit = first ? { level: first.level, type: first.type } : null;
    } else {
      if (entry.offensiveTypes.length === 0) continue;
      hit = bestAttackLevel(entry.offensiveTypes, defenders);
    }
    if (!hit) continue;

    seen.add(p.id);
    candidates.push({
      entry,
      attackType: hit.type,
      level: hit.level,
      isFull: profile.fullLevels.includes(hit.level),
      isFallback: !extra && !main,
      stars: Math.min(MAX_STARS, rule.stars ?? 0),
      priority: rule.priority,
      wildcard,
      isExtra: !!extra,
      isTarget,
    });
  }
  return { profile, candidates };
}

/**
 * Quais tipos dá para usar num time de tipo único e quantos Pokémon (espécies) existem de cada um.
 * Coringas contam para todos os tipos.
 */
export function monoOptions(candidates: Candidate[], profile: WeaknessProfile): MonoOption[] {
  const wild = new Set(candidates.filter((c) => c.wildcard).map((c) => speciesKey(c.entry)));
  return profile.attacks
    .map((a) => {
      const own = new Set(candidates.filter((c) => !c.wildcard && c.entry.offensiveTypes.includes(a.type)).map((c) => speciesKey(c.entry)));
      return { type: a.type, level: a.level, full: profile.fullLevels.includes(a.level), count: new Set([...own, ...wild]).size };
    })
    .sort((a, b) => Number(b.full) - Number(a.full) || b.count - a.count);
}

/**
 * Ordem de preferência: tiers do tipo de time antes dos de reforço; dentro deles, a efetividade ideal
 * (2x) primeiro e depois a prioridade do tier.
 */
const bucketOf = (c: Candidate) => (c.isFallback ? 0 : 5000) + (c.isFull ? 1000 : 0) + c.priority;

const byName = (a: Candidate, b: Candidate) =>
  a.entry.pokemon.name.localeCompare(b.entry.pokemon.name, "pt-BR") || (a.entry.pokemon.variant ?? "").localeCompare(b.entry.pokemon.variant ?? "", "pt-BR");

/** Escolhe entre os melhores da lista; prefere um tipo ofensivo que o time ainda não tem, para dar variedade. */
function pickFrom(options: Candidate[], usedTypes: Set<PokemonType>, random: (() => number) | null): Candidate {
  const top = Math.max(...options.map(bucketOf));
  let pool = options.filter((c) => bucketOf(c) === top).sort(byName);
  const fresh = pool.filter((c) => c.wildcard || !usedTypes.has(c.attackType));
  if (fresh.length > 0) pool = fresh;
  return random ? pool[Math.floor(random() * pool.length)] : pool[0];
}

/**
 * `limitsOff`: com uma lista de Pokémon úteis ativa, o limite de Pokémon por tier (ex.: no máximo 2 T1) não vale,
 * porque quem escolheu os Pokémon foi o usuário. A preferência entre tiers (T2 antes de T1) continua.
 */
function buildOneTeam(candidates: Candidate[], preset: TeamPreset, profile: WeaknessProfile, seed: number, allowed: AttackOption[], limitsOff = false): TeamResult {
  const random = seed === 0 ? null : rng(seed);
  const limits = new Map([...preset.tiers, ...(preset.fallback ?? [])].map((t) => [t.tier, t]));
  const picked: Candidate[] = [];
  const usedSpecies = new Set<string>();
  const usedTypes = new Set<PokemonType>();
  const countOf = (tier: Tier) => picked.filter((c) => c.entry.pokemon.tier === tier && !c.isExtra).length;
  const canTake = (c: Candidate) => {
    if (usedSpecies.has(speciesKey(c.entry))) return false;
    const max = c.isExtra || limitsOff ? undefined : limits.get(c.entry.pokemon.tier!)?.max;
    return max === undefined || countOf(c.entry.pokemon.tier!) < max;
  };
  const take = (c: Candidate) => {
    picked.push(c);
    usedSpecies.add(speciesKey(c.entry));
    if (!c.wildcard) usedTypes.add(c.attackType);
  };

  // 1) Garante o mínimo de cada tier (ex.: ao menos 1 Super Rare no time "razoável").
  for (const rule of preset.tiers) {
    while (rule.min && countOf(rule.tier) < rule.min && picked.length < TEAM_SIZE) {
      const options = candidates.filter((c) => c.entry.pokemon.tier === rule.tier && !c.isExtra && !c.isFallback && canTake(c));
      if (options.length === 0) break;
      take(pickFrom(options, usedTypes, random));
    }
  }

  // 2) Completa o restante respeitando a prioridade (2x > 1.5x, depois o tier preferido).
  while (picked.length < TEAM_SIZE) {
    const options = candidates.filter(canTake);
    if (options.length === 0) break;
    take(pickFrom(options, usedTypes, random));
  }

  // 3) Coringas assumem o tipo de que o time precisa: entre os tipos permitidos, o de efetividade ideal que o time mais usa.
  const fixed = picked.filter((c) => !c.wildcard);
  const ideal = allowed.filter((a) => profile.fullLevels.includes(a.level));
  const pool = ideal.length > 0 ? ideal : allowed;
  const bestForWildcard = [...pool].sort((a, b) => fixed.filter((m) => m.attackType === b.type).length - fixed.filter((m) => m.attackType === a.type).length)[0];
  const resolved = picked.map((c) =>
    c.wildcard && bestForWildcard
      ? { ...c, attackType: bestForWildcard.type, level: bestForWildcard.level, isFull: profile.fullLevels.includes(bestForWildcard.level) }
      : c,
  );

  resolved.sort((a, b) => bucketOf(b) - bucketOf(a) || byName(a, b));
  return { members: resolved, missing: TEAM_SIZE - resolved.length };
}

const signature = (t: TeamResult) => t.members.map((m) => m.entry.pokemon.id + ":" + m.attackType).sort().join("|");

/**
 * Monta várias opções de time para o alvo. A opção 1 é sempre a mesma (determinística);
 * as demais variam a escolha entre Pokémon equivalentes. `round` gera um novo lote.
 */
export function buildTeams(entries: PokedexEntry[], target: PokedexEntry, preset: TeamPreset, options: BuildOptions = {}): TeamBuild {
  const { count = 3, round = 0, includeFallback = true, onlyTypes = [], pool, includeTarget = false } = options;
  const { profile, candidates: all } = listCandidates(entries, target, preset, includeFallback, pool, includeTarget);

  // Tipos permitidos que realmente batem o alvo (do melhor nível para o pior). Sem restrição = todos que batem.
  const restricted = onlyTypes.length > 0;
  const allowed: AttackOption[] = restricted ? profile.attacks.filter((a) => onlyTypes.includes(a.type)) : profile.attacks;

  let usable: Candidate[] = all;
  if (restricted) {
    usable = all.flatMap((c) => {
      if (c.wildcard) return allowed[0] ? [{ ...c, attackType: allowed[0].type, level: allowed[0].level, isFull: profile.fullLevels.includes(allowed[0].level) }] : [];
      // Usa o melhor tipo ofensivo do Pokémon dentre os tipos permitidos.
      const usableTypes = allowed.filter((a) => c.entry.offensiveTypes.includes(a.type));
      const best = [...usableTypes].sort((a, b) => EFFECT_MULTIPLIER[b.level] - EFFECT_MULTIPLIER[a.level])[0];
      return best ? [{ ...c, attackType: best.type, level: best.level, isFull: profile.fullLevels.includes(best.level) }] : [];
    });
  }
  usable.sort((a, b) => bucketOf(b) - bucketOf(a) || byName(a, b));

  const teams: TeamResult[] = [];
  const seen = new Set<string>();
  for (let attempt = 0; teams.length < count && attempt < 60; attempt++) {
    const seed = round === 0 && attempt === 0 ? 0 : round * 1000 + attempt + 1;
    const team = buildOneTeam(usable, preset, profile, seed, allowed, !!pool && pool.size > 0);
    if (team.members.length === 0) break;
    const sig = signature(team);
    if (seen.has(sig)) continue;
    seen.add(sig);
    teams.push(team);
  }
  return { profile, candidates: usable, teams };
}
