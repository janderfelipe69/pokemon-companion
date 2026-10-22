import { TIERS, type Pokemon, type PokemonType } from "@/types/pokemon";
import type { TierKey } from "@/config/tiers";
import { normalize } from "./pokemonFilters";

export type TierSort = "list" | "az";

export type TierFilters = {
  query: string;
  tier: TierKey | "";
  type: PokemonType | "";
  sort: TierSort;
};

export const TIER_KEYS: TierKey[] = [...TIERS, "undefined"];

export const compareByName = (a: Pokemon, b: Pokemon) =>
  a.name.localeCompare(b.name, "pt-BR") || (a.variant ?? "").localeCompare(b.variant ?? "", "pt-BR");

export const tierKeyOf = (p: Pokemon): TierKey => p.tier ?? "undefined";

/** Aplica busca, filtros e ordenação e agrupa por tier (grupos vazios são omitidos). */
export function groupByTier(list: Pokemon[], { query, tier, type, sort }: TierFilters) {
  const q = normalize(query);
  let items = list.filter((p) => {
    if (q && !normalize(p.sourceName ?? p.name).includes(q)) return false;
    if (tier && tierKeyOf(p) !== tier) return false;
    if (type && p.listedType !== type) return false;
    return true;
  });
  if (sort === "az") {
    items = [...items].sort(compareByName);
  }
  return {
    total: items.length,
    groups: TIER_KEYS.map((key) => ({ key, items: items.filter((p) => tierKeyOf(p) === key) })).filter((g) => g.items.length > 0),
  };
}

export function countByTier(list: Pokemon[]): Record<TierKey, number> {
  const counts = Object.fromEntries(TIER_KEYS.map((k) => [k, 0])) as Record<TierKey, number>;
  list.forEach((p) => counts[tierKeyOf(p)]++);
  return counts;
}
