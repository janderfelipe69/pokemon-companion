import { MAX_STARS, type TeamPreset } from "@/config/teamPresets";
import { bestAttackLevel, weaknessProfile, type EffectLevel, type WeaknessProfile } from "@/lib/effectiveness";
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
};

export type TeamResult = {
  members: Candidate[];
  /** Quantos Pokémon faltaram para completar os 6 (não existem efetivos suficientes nesse tipo de time). */
  missing: number;
};

export type TeamBuild = {
  profile: WeaknessProfile;
  /** Todos os Pokémon do tipo de time que batem o alvo, já ordenados por prioridade. */
  candidates: Candidate[];
  teams: TeamResult[];
};

/** Identifica a espécie sem a variante, para não repetir o mesmo Pokémon (normal, Shiny, Mega) no time. */
const speciesKey = (e: PokedexEntry) => e.pokemon.name.toLowerCase();

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

/** Regras de um tier dentro do tipo de time (principal ou reforço). */
const ruleOf = (preset: TeamPreset, tier: Tier | null | undefined, includeFallback: boolean) =>
  preset.tiers.find((t) => t.tier === tier) ?? (includeFallback ? preset.fallback?.find((t) => t.tier === tier) : undefined);

export function listCandidates(entries: PokedexEntry[], target: PokedexEntry, preset: TeamPreset, includeFallback = true): { profile: WeaknessProfile; candidates: Candidate[] } {
  const defenders = target.originalTypes ?? [];
  const profile = weaknessProfile(defenders);
  const mainTiers = new Set<Tier>(preset.tiers.map((t) => t.tier));
  const allowed = new Set<Tier>([...mainTiers, ...(includeFallback ? (preset.fallback ?? []).map((t) => t.tier) : [])]);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (const entry of entries) {
    const { pokemon: p } = entry;
    if (!p.tier || !allowed.has(p.tier) || p.id === target.pokemon.id) continue;
    if (seen.has(p.id) || entry.offensiveTypes.length === 0) continue;
    seen.add(p.id);
    const hit = bestAttackLevel(entry.offensiveTypes, defenders);
    if (!hit) continue;
    candidates.push({ entry, attackType: hit.type, level: hit.level, isFull: profile.fullLevels.includes(hit.level), isFallback: !mainTiers.has(p.tier), stars: Math.min(MAX_STARS, ruleOf(preset, p.tier, includeFallback)?.stars ?? 0) });
  }
  return { profile, candidates };
}

const tierPriority = (preset: TeamPreset, c: Candidate) => ruleOf(preset, c.entry.pokemon.tier, true)?.priority ?? 0;

/**
 * Ordem de preferência: tiers do tipo de time antes dos de reforço; dentro deles, a efetividade ideal
 * (2x) primeiro e depois o tier preferido.
 */
const bucketOf = (preset: TeamPreset, c: Candidate) => (c.isFallback ? 0 : 5000) + (c.isFull ? 1000 : 0) + tierPriority(preset, c);

const byName = (a: Candidate, b: Candidate) =>
  a.entry.pokemon.name.localeCompare(b.entry.pokemon.name, "pt-BR") || (a.entry.pokemon.variant ?? "").localeCompare(b.entry.pokemon.variant ?? "", "pt-BR");

function buildOneTeam(candidates: Candidate[], preset: TeamPreset, seed: number): TeamResult {
  const random = rng(seed);
  const limits = new Map([...preset.tiers, ...(preset.fallback ?? [])].map((t) => [t.tier, t]));
  const picked: Candidate[] = [];
  const usedSpecies = new Set<string>();
  const usedTypes = new Set<PokemonType>();
  const countOf = (tier: Tier) => picked.filter((c) => c.entry.pokemon.tier === tier).length;
  const canTake = (c: Candidate) => {
    const tier = c.entry.pokemon.tier!;
    const max = limits.get(tier)?.max;
    return !usedSpecies.has(speciesKey(c.entry)) && (max === undefined || countOf(tier) < max);
  };
  const take = (c: Candidate) => {
    picked.push(c);
    usedSpecies.add(speciesKey(c.entry));
    usedTypes.add(c.attackType);
  };

  // 1) Garante o mínimo de cada tier (ex.: ao menos 1 Super Rare no time "razoável"), do melhor nível para o pior.
  for (const rule of preset.tiers) {
    while (rule.min && countOf(rule.tier) < rule.min && picked.length < TEAM_SIZE) {
      const options = candidates.filter((c) => c.entry.pokemon.tier === rule.tier && canTake(c));
      if (options.length === 0) break;
      take(pickFrom(options, preset, usedTypes, seed === 0 ? null : random));
    }
  }

  // 2) Completa o restante respeitando a prioridade (2x > 1.5x, depois o tier preferido).
  while (picked.length < TEAM_SIZE) {
    const options = candidates.filter(canTake);
    if (options.length === 0) break;
    take(pickFrom(options, preset, usedTypes, seed === 0 ? null : random));
  }

  picked.sort((a, b) => bucketOf(preset, b) - bucketOf(preset, a) || byName(a, b));
  return { members: picked, missing: TEAM_SIZE - picked.length };
}

/** Escolhe entre os melhores da lista; prefere um tipo ofensivo que o time ainda não tem, para dar variedade. */
function pickFrom(options: Candidate[], preset: TeamPreset, usedTypes: Set<PokemonType>, random: (() => number) | null): Candidate {
  const top = Math.max(...options.map((c) => bucketOf(preset, c)));
  let pool = options.filter((c) => bucketOf(preset, c) === top).sort(byName);
  const fresh = pool.filter((c) => !usedTypes.has(c.attackType));
  if (fresh.length > 0) pool = fresh;
  return random ? pool[Math.floor(random() * pool.length)] : pool[0];
}

const signature = (t: TeamResult) => t.members.map((m) => m.entry.pokemon.id).sort().join("|");

/**
 * Monta várias opções de time para o alvo. A opção 1 é sempre a mesma (determinística);
 * as demais variam a escolha entre Pokémon equivalentes. `round` gera um novo lote.
 */
export function buildTeams(entries: PokedexEntry[], target: PokedexEntry, preset: TeamPreset, options: { count?: number; round?: number; includeFallback?: boolean } = {}): TeamBuild {
  const { count = 3, round = 0, includeFallback = true } = options;
  const { profile, candidates } = listCandidates(entries, target, preset, includeFallback);
  candidates.sort((a, b) => bucketOf(preset, b) - bucketOf(preset, a) || byName(a, b));

  const teams: TeamResult[] = [];
  const seen = new Set<string>();
  for (let attempt = 0; teams.length < count && attempt < 60; attempt++) {
    const seed = round === 0 && attempt === 0 ? 0 : round * 1000 + attempt + 1;
    const team = buildOneTeam(candidates, preset, seed);
    if (team.members.length === 0) break;
    const sig = signature(team);
    if (seen.has(sig)) continue;
    seen.add(sig);
    teams.push(team);
  }
  return { profile, candidates, teams };
}
