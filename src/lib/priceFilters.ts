import type { Pokemon, PokemonType } from "@/types/pokemon";
import type { TierKey } from "@/config/tiers";
import { compareDecimal } from "./money";
import { hasAnyPrice } from "./prices";
import { normalize } from "./pokemonFilters";
import { compareByName, TIER_KEYS, tierKeyOf } from "./tierFilters";

export type PriceStatus = "all" | "with" | "without";
export type PriceSort = "list" | "az" | "tier" | "kk" | "brl";
export type SortDirection = "asc" | "desc";

export type PriceFilters = {
  query: string;
  tier: TierKey | "";
  type: PokemonType | "";
  status: PriceStatus;
  sort: PriceSort;
  direction: SortDirection;
};

/** "Com preço" = ao menos um dos dois preços cadastrado (inclusive 0). */
export function filterAndSortPrices(list: Pokemon[], f: PriceFilters): Pokemon[] {
  const q = normalize(f.query);
  const items = list.filter((p) => {
    if (q && !normalize(p.sourceName ?? p.name).includes(q)) return false;
    if (f.tier && tierKeyOf(p) !== f.tier) return false;
    if (f.type && p.listedType !== f.type) return false;
    if (f.status === "with" && !hasAnyPrice(p)) return false;
    if (f.status === "without" && hasAnyPrice(p)) return false;
    return true;
  });

  if (f.sort === "az") return [...items].sort(compareByName);
  if (f.sort === "list") return items;
  if (f.sort === "tier") {
    const rank = (p: Pokemon) => TIER_KEYS.indexOf(tierKeyOf(p));
    return [...items].sort((a, b) => rank(a) - rank(b) || compareByName(a, b));
  }

  const key = f.sort === "kk" ? "priceKk" : "priceBrl";
  const sign = f.direction === "asc" ? 1 : -1;
  // Preço não definido vai sempre para o fim, em qualquer direção.
  return [...items].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (x == null && y == null) return compareByName(a, b);
    if (x == null) return 1;
    if (y == null) return -1;
    return sign * compareDecimal(x, y) || compareByName(a, b);
  });
}

export function priceCounts(list: Pokemon[]) {
  return {
    total: list.length,
    withAny: list.filter(hasAnyPrice).length,
    withoutAny: list.filter((p) => !hasAnyPrice(p)).length,
    withKk: list.filter((p) => p.priceKk != null).length,
    withBrl: list.filter((p) => p.priceBrl != null).length,
  };
}
