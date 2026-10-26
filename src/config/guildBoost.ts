import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

/** Os 18 tipos (em inglês, como no jogo) que um membro pode escolher receber. */
export const BOOST_TYPES = Object.keys(typeInfo) as PokemonType[];

export const isBoostType = (value: unknown): value is PokemonType => typeof value === "string" && (BOOST_TYPES as string[]).includes(value);

/** Força de cada stone que cai no boss da guilda. O tipo vem junto: ex. "Advanced Fire" = +26 a +30 de Fire. */
export const STONE_TIERS = [
  { key: "novice", label: "Novice", min: 1, max: 5 },
  { key: "elemental", label: "Elemental", min: 6, max: 10 },
  { key: "common", label: "Common", min: 11, max: 15 },
  { key: "enhanced", label: "Enhanced", min: 16, max: 20 },
  { key: "potent", label: "Potent", min: 21, max: 25 },
  { key: "advanced", label: "Advanced", min: 26, max: 30 },
] as const;

export type StoneTierKey = (typeof STONE_TIERS)[number]["key"];

export const TIER_KEYS = STONE_TIERS.map((t) => t.key) as StoneTierKey[];

export const isTierKey = (value: unknown): value is StoneTierKey => typeof value === "string" && (TIER_KEYS as string[]).includes(value);

/** Um tipo que o membro quer receber e quais níveis de stone dele interessam. */
export type BoostWant = { type: PokemonType; tiers: StoneTierKey[] };

/** Quando o membro marca um tipo pela primeira vez, vem só o nível mais forte. */
export const DEFAULT_TIERS: StoneTierKey[] = ["advanced"];

/**
 * Limpa uma lista vinda de fora (navegador ou banco): descarta o que for inválido, junta tipos repetidos
 * e deixa tudo na ordem do jogo (tipos e níveis). Tipo sem nenhum nível válido sai da lista.
 */
export function normalizeWants(list: unknown): BoostWant[] {
  if (!Array.isArray(list)) return [];
  const byType = new Map<PokemonType, Set<StoneTierKey>>();
  for (const item of list) {
    const { type, tiers } = (item ?? {}) as { type?: unknown; tiers?: unknown };
    if (!isBoostType(type) || !Array.isArray(tiers)) continue;
    const set = byType.get(type) ?? new Set<StoneTierKey>();
    for (const tier of tiers) if (isTierKey(tier)) set.add(tier);
    byType.set(type, set);
  }
  return BOOST_TYPES.flatMap((type) => {
    const set = byType.get(type);
    return set && set.size > 0 ? [{ type, tiers: TIER_KEYS.filter((k) => set.has(k)) }] : [];
  });
}

/** Valida a lista enviada ao servidor: devolve `null` se tiver QUALQUER item inválido (em vez de descartar em silêncio). */
export function parseWants(list: unknown): BoostWant[] | null {
  if (!Array.isArray(list) || list.length > BOOST_TYPES.length) return null;
  const seen = new Set<string>();
  for (const item of list) {
    const { type, tiers } = (item ?? {}) as { type?: unknown; tiers?: unknown };
    if (!isBoostType(type) || seen.has(type)) return null;
    if (!Array.isArray(tiers) || tiers.length === 0 || tiers.length > TIER_KEYS.length || !tiers.every(isTierKey)) return null;
    seen.add(type);
  }
  return normalizeWants(list);
}

export const sameWants = (a: readonly BoostWant[], b: readonly BoostWant[]) =>
  a.length === b.length && a.every((w, i) => w.type === b[i].type && w.tiers.length === b[i].tiers.length && w.tiers.every((t, j) => t === b[i].tiers[j]));

/** Um drop publicado vale este tempo e depois some sozinho. */
export const DROP_TTL_HOURS = 24;
export const MAX_STONE_QTY = 999;

/** Uma stone que o membro tem para a rodada: "2x Advanced Fire". */
export type DropStone = { type: PokemonType; tier: StoneTierKey; qty: number };

/** Ordem do jogo: tipos na ordem de sempre e, dentro do tipo, do nível mais fraco ao mais forte. */
export function sortDrops(list: readonly DropStone[]): DropStone[] {
  const order = (d: DropStone) => BOOST_TYPES.indexOf(d.type) * 10 + TIER_KEYS.indexOf(d.tier);
  return list.map(({ type, tier, qty }) => ({ type, tier, qty })).sort((a, b) => order(a) - order(b));
}

/** Valida os drops enviados ao servidor: `null` se qualquer item for inválido ou repetido. */
export function parseDrops(list: unknown): DropStone[] | null {
  if (!Array.isArray(list) || list.length > BOOST_TYPES.length * TIER_KEYS.length) return null;
  const seen = new Set<string>();
  for (const item of list) {
    const { type, tier, qty } = (item ?? {}) as { type?: unknown; tier?: unknown; qty?: unknown };
    if (!isBoostType(type) || !isTierKey(tier) || !Number.isInteger(qty) || (qty as number) < 1 || (qty as number) > MAX_STONE_QTY) return null;
    if (seen.has(`${type}:${tier}`)) return null;
    seen.add(`${type}:${tier}`);
  }
  return sortDrops(list as DropStone[]);
}

export const MAX_NICK_LENGTH = 40;
