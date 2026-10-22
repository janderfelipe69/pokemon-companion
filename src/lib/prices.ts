import type { Pokemon, PokemonPrices, PriceMap } from "@/types/pokemon";
import { parsePrice } from "./money";

/** Junta os preços cadastrados aos Pokémon, sem alterar nome, tier nem tipo. */
export function applyPrices(list: Pokemon[], prices: PriceMap): Pokemon[] {
  return list.map((p) => ({ ...p, priceKk: prices[p.id]?.kk ?? null, priceBrl: prices[p.id]?.brl ?? null }));
}

export const hasAnyPrice = (p: Pokemon) => p.priceKk != null || p.priceBrl != null;

/** Campos omitidos não mudam; "" ou null limpam o preço (voltam a "não definido"). */
export type PriceUpdate = { kk?: string | null; brl?: string | null };

export type PriceUpdateResult = { ok: true; prices: PriceMap } | { ok: false; errors: string[] };

/**
 * Atualiza os preços de um Pokémon pelo ID. Função pura: devolve um novo mapa e não grava nada.
 * Só lê `kk` e `brl`; qualquer outro campo do objeto (nome, tier, tipo...) é ignorado.
 * Se algum valor for inválido, nada é alterado.
 */
export function updatePrices(
  prices: PriceMap,
  knownIds: ReadonlySet<string>,
  id: string,
  update: PriceUpdate,
): PriceUpdateResult {
  if (!knownIds.has(id)) return { ok: false, errors: [`Pokémon não encontrado: "${id}".`] };

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
