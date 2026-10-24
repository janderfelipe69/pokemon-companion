
import type { Pokemon, PokemonPrices, PriceMap, Tier, TierPriceRanges } from "@/types/pokemon";
import { parsePrice } from "./money";

/** Junta preços individuais aos Pokémon, sem alterar nome, tier ou tipos. */
export function applyPrices(list: Pokemon[], prices: PriceMap): Pokemon[] {
  return list.map((p) => ({
    ...p,
    priceKk: prices[p.id]?.kk ?? null,
    priceBrl: prices[p.id]?.brl ?? null,
  }));
}

/**
 * Aplica a faixa do tier somente onde não existe preço individual (por moeda).
 * O valor vem do tier => `price…FromTier` e, se houver faixa, `price…Max`.
 */
export function applyTierPrices(
  list: Pokemon[],
  tierPrices: Partial<Record<Tier, TierPriceRanges>>,
): Pokemon[] {
  return list.map((p) => {
    const defaults = p.tier ? tierPrices[p.tier] : undefined;
    const next: Pokemon = { ...p };

    if (p.priceKk == null && defaults?.kk.min != null) {
      next.priceKk = defaults.kk.min;
      next.priceKkMax = defaults.kk.max;
      next.priceKkFromTier = true;
    }
    if (p.priceBrl == null && defaults?.brl.min != null) {
      next.priceBrl = defaults.brl.min;
      next.priceBrlMax = defaults.brl.max;
      next.priceBrlFromTier = true;
    }
    return next;
  });
}

export const hasAnyPrice = (p: Pokemon) =>
  p.priceKk != null || p.priceBrl != null;

/** Campos omitidos não mudam; "" ou null limpam o preço individual. */
export type PriceUpdate = { kk?: string | null; brl?: string | null };

export type PriceUpdateResult =
  | { ok: true; prices: PriceMap }
  | { ok: false; errors: string[] };

export function updatePrices(
  prices: PriceMap,
  knownIds: ReadonlySet<string>,
  id: string,
  update: PriceUpdate,
): PriceUpdateResult {
  if (!knownIds.has(id)) {
    return { ok: false, errors: [`Pokémon não encontrado: "${id}".`] };
  }

  const errors: string[] = [];
  const changes: Partial<PokemonPrices> = {};

  for (const currency of ["kk", "brl"] as const) {
    if (update[currency] === undefined) continue;
    const result = parsePrice(update[currency], currency);

    if (result.ok) changes[currency] = result.value;
    else errors.push(result.error);
  }

  if (errors.length > 0) return { ok: false, errors };

  const merged = { ...prices[id], ...changes };
  const next: PriceMap = { ...prices };

  if (merged.kk == null && merged.brl == null) delete next[id];
  else next[id] = merged;

  return { ok: true, prices: next };
}
