import { HUNT_TIERS } from "@/config/teamPresets";
import { EFFECT_MULTIPLIER, levelOf, rawMultiplier, weaknessProfile, type EffectLevel } from "@/lib/effectiveness";
import type { PokedexEntry } from "@/types/pokedex";
import { POKEMON_TYPES, type PokemonType, type Tier } from "@/types/pokemon";

/** Pokémon que dá para caçar (Mythic, Legendary e Ultra Rare com tipagem conhecida), ordenados por tier e nome. */
export function huntTargets(entries: PokedexEntry[]): PokedexEntry[] {
  const order = (t: Tier | null | undefined) => HUNT_TIERS.indexOf(t as Tier);
  return entries
    .filter((e) => e.pokemon.tier && HUNT_TIERS.includes(e.pokemon.tier) && e.originalTypes && e.originalTypes.length > 0)
    .sort((a, b) => order(a.pokemon.tier) - order(b.pokemon.tier) || (a.pokemon.sourceName ?? a.pokemon.name).localeCompare(b.pokemon.sourceName ?? b.pokemon.name, "pt-BR"));
}

export type Hit = { type: PokemonType; level: EffectLevel };

export type Reach = {
  entry: PokedexEntry;
  /** Todos os tipos escolhidos que batem o alvo (o melhor primeiro). */
  hits: Hit[];
  /** `true` = efetividade máxima possível contra este alvo (2x; ou 1.5x quando o alvo não tem acerto duplo). Mesma regra do montador. */
  full: boolean;
};

/** Os tipos de ataque que batem o alvo, do melhor para o pior, restritos aos `types` escolhidos. */
function hitsOn(defenders: PokemonType[], types: readonly PokemonType[]): Hit[] {
  const hits: Hit[] = [];
  for (const type of types) {
    const level = levelOf(rawMultiplier(type, defenders));
    if (level) hits.push({ type, level });
  }
  return hits.sort((a, b) => EFFECT_MULTIPLIER[b.level] - EFFECT_MULTIPLIER[a.level]);
}

/** Quais alvos os tipos escolhidos batem (e com que força) e quais ficam de fora. */
export function reachFor(targets: PokedexEntry[], types: readonly PokemonType[]): { reached: Reach[]; missed: PokedexEntry[] } {
  const reached: Reach[] = [];
  const missed: PokedexEntry[] = [];
  for (const entry of targets) {
    const defenders = entry.originalTypes ?? [];
    const hits = hitsOn(defenders, types);
    if (hits.length === 0) {
      missed.push(entry);
      continue;
    }
    const { fullLevels } = weaknessProfile(defenders);
    reached.push({ entry, hits, full: fullLevels.includes(hits[0].level) });
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
