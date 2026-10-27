import { HUNT_TIERS } from "@/config/teamPresets";
import { isHuntableMega, isSealedDrop } from "@/lib/sealed";
import { EFFECT_MULTIPLIER, levelOf, rawMultiplier, weaknessProfile, type EffectLevel } from "@/lib/effectiveness";
import type { PokedexEntry } from "@/types/pokedex";
import { POKEMON_TYPES, TIERS, type PokemonType, type Tier } from "@/types/pokemon";

/**
 * Pokémon que dá para caçar: Mythic, Legendary e Ultra Rare com tipagem conhecida, ordenados por tier e nome.
 * Megas ficam de fora (são DZ das caças Sealed), exceto os que são caça de verdade (Clefable), mesmo que o tier dela seja outro.
 */
export function huntTargets(entries: PokedexEntry[]): PokedexEntry[] {
  const order = (t: Tier | null | undefined) => {
    const i = HUNT_TIERS.indexOf(t as Tier);
    return i < 0 ? HUNT_TIERS.length : i;
  };
  return entries
    .filter((e) => !isSealedDrop(e.pokemon) && ((e.pokemon.tier && HUNT_TIERS.includes(e.pokemon.tier)) || isHuntableMega(e.pokemon)) && e.originalTypes && e.originalTypes.length > 0)
    .sort((a, b) => order(a.pokemon.tier) - order(b.pokemon.tier) || (a.pokemon.sourceName ?? a.pokemon.name).localeCompare(b.pokemon.sourceName ?? b.pokemon.name, "pt-BR"));
}

/** Megas caçáveis em DZ (caças Sealed) com tipagem conhecida, por tier (Mythic primeiro) e nome. Ficam separados dos alvos normais. */
export function sealedTargets(entries: PokedexEntry[]): PokedexEntry[] {
  const order = (t: Tier | null | undefined) => {
    const i = TIERS.indexOf(t as Tier);
    return i < 0 ? TIERS.length : i;
  };
  return entries
    .filter((e) => isSealedDrop(e.pokemon) && e.originalTypes && e.originalTypes.length > 0)
    .sort((a, b) => order(a.pokemon.tier) - order(b.pokemon.tier) || (a.pokemon.sourceName ?? a.pokemon.name).localeCompare(b.pokemon.sourceName ?? b.pokemon.name, "pt-BR"));
}

export type Hit = { type: PokemonType; level: EffectLevel; /** Esse tipo, sozinho, já bate o máximo possível contra este alvo. */ full: boolean };

/** `all` = só os alvos que TODOS os tipos escolhidos batem (o que o conjunto caça junto). `any` = os que ao menos um tipo bate. */
export type MatchMode = "all" | "any";

export type Reach = {
  entry: PokedexEntry;
  /** Os tipos escolhidos que batem o alvo (o melhor primeiro). */
  hits: Hit[];
  /** `true` = efetividade máxima. Em `any`, o melhor tipo já basta; em `all`, TODOS os tipos têm que bater o máximo (o time vale o que o pior tipo vale). */
  full: boolean;
};

/** Os tipos de ataque escolhidos que batem o alvo, do melhor para o pior. */
export function hitsOn(defenders: PokemonType[], types: readonly PokemonType[]): Hit[] {
  const { fullLevels } = weaknessProfile(defenders);
  const hits: Hit[] = [];
  for (const type of types) {
    const level = levelOf(rawMultiplier(type, defenders));
    if (level) hits.push({ type, level, full: fullLevels.includes(level) });
  }
  return hits.sort((a, b) => EFFECT_MULTIPLIER[b.level] - EFFECT_MULTIPLIER[a.level]);
}

/** Quais alvos os tipos escolhidos batem (e com que força) e quais ficam de fora. */
export function reachFor(targets: PokedexEntry[], types: readonly PokemonType[], mode: MatchMode = "any"): { reached: Reach[]; missed: PokedexEntry[] } {
  const reached: Reach[] = [];
  const missed: PokedexEntry[] = [];
  for (const entry of targets) {
    const hits = hitsOn(entry.originalTypes ?? [], types);
    const ok = mode === "all" ? hits.length === types.length && types.length > 0 : hits.length > 0;
    if (!ok) {
      missed.push(entry);
      continue;
    }
    reached.push({ entry, hits, full: mode === "all" ? hits.every((h) => h.full) : hits[0].full });
  }
  return { reached, missed };
}

export type TypeTally = { type: PokemonType; /** Alvos que o tipo bate com efetividade máxima. */ full: number; /** Alvos que o tipo bate de qualquer forma. */ total: number };

/** Para cada um dos 18 tipos: quantos alvos ele bate. Ordem da lista de tipos do jogo. */
export function tallyTypes(targets: PokedexEntry[]): TypeTally[] {
  return POKEMON_TYPES.map((type) => {
    const { reached } = reachFor(targets, [type]);
    return { type, full: reached.filter((r) => r.full).length, total: reached.length };
  });
}

/** Lê "dark,ghost" da URL e devolve só tipos válidos, sem repetir. */
export function parseTypeParam(value: string | null): PokemonType[] {
  if (!value) return [];
  const valid = new Set<string>(POKEMON_TYPES);
  return [...new Set(value.toLowerCase().split(",").map((t) => t.trim()))].filter((t): t is PokemonType => valid.has(t));
}
