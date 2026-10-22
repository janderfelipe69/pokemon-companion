import type { TierKey } from "@/config/tiers";
import type { PokedexEntry } from "@/types/pokedex";
import type { PokemonType } from "@/types/pokemon";
import { normalize } from "./pokemonFilters";
import { tierKeyOf } from "./tierFilters";

/** Valor do filtro de variante para registros sem variante. */
export const NORMAL_VARIANT = "__normal__";

export type PokedexFilters = {
  query: string;
  originalType: PokemonType | "";
  offensiveType: PokemonType | "";
  tier: TierKey | "";
  /** "" = todas, NORMAL_VARIANT = sem variante, ou o nome de uma variante (ex.: "Shiny"). */
  variant: string;
};

export const emptyPokedexFilters: PokedexFilters = { query: "", originalType: "", offensiveType: "", tier: "", variant: "" };

export const hasPokedexFilters = (f: PokedexFilters) => Object.values(f).some((v) => v !== "");

/** Todos os critérios preenchidos precisam ser atendidos ao mesmo tempo. */
export function filterEntries(entries: PokedexEntry[], f: PokedexFilters): PokedexEntry[] {
  const q = normalize(f.query);
  return entries.filter(({ pokemon: p, originalTypes, offensiveTypes }) => {
    if (q && !normalize(p.sourceName ?? p.name).includes(q)) return false;
    if (f.originalType && !originalTypes?.includes(f.originalType)) return false;
    if (f.offensiveType && !offensiveTypes.includes(f.offensiveType)) return false;
    if (f.tier && tierKeyOf(p) !== f.tier) return false;
    if (f.variant === NORMAL_VARIANT) return !p.variant;
    if (f.variant && p.variant !== f.variant) return false;
    return true;
  });
}

/** Variantes que realmente existem nos dados (sem lista fixa). */
export function variantOptions(entries: PokedexEntry[]): string[] {
  return [...new Set(entries.flatMap((e) => (e.pokemon.variant ? [e.pokemon.variant] : [])))].sort();
}
