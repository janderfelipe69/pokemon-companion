import { formatNumber, statCategory, statLabel, type Medal, type MedalStatKey } from "@/data/medals";

export type MedalFilters = {
  query: string;
  /** Mostra medalhas que dão QUALQUER um destes buffs (vazio = todas). */
  plus: MedalStatKey[];
  /** Esconde medalhas cujo debuff seja um destes. */
  avoid: MedalStatKey[];
  /** Só medalhas sem debuff. */
  noDebuff: boolean;
};

export const emptyMedalFilters: MedalFilters = { query: "", plus: [], avoid: [], noDebuff: false };

export const hasMedalFilters = (f: MedalFilters) =>
  f.query.trim() !== "" || f.plus.length > 0 || f.avoid.length > 0 || f.noDebuff;

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/**
 * Aplica busca e presets. Com preset de buff ligado, as medalhas vêm da MAIOR para a menor %
 * (as que ainda não têm % cadastrada ficam no fim).
 */
export function filterMedals(medals: Medal[], f: MedalFilters): Medal[] {
  const q = normalize(f.query);
  const items = medals.filter((m) => {
    if (f.plus.length > 0 && !f.plus.includes(m.plus)) return false;
    if (f.noDebuff && m.minus !== null) return false;
    if (m.minus !== null && f.avoid.includes(m.minus)) return false;
    if (q) {
      const haystack = normalize(`${m.id} ${m.name} ${statLabel(m.plus)} ${m.minus ? statLabel(m.minus) : "sem debuff"}`);
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  if (f.plus.length === 0) return items;
  return [...items].sort((a, b) => (b.plusValue ?? -1) - (a.plusValue ?? -1) || a.id - b.id);
}

export type StatTotal = { key: MedalStatKey; value: number };

/** Soma líquida por buff, usando a % de cada medalha. Medalhas sem % cadastrada não entram na soma. */
export function computeTotals(medals: Medal[]): { totals: StatTotal[]; missing: number } {
  const sums = new Map<MedalStatKey, number>();
  let missing = 0;
  for (const m of medals) {
    let incomplete = false;
    if (m.plusValue == null) incomplete = true;
    else sums.set(m.plus, (sums.get(m.plus) ?? 0) + m.plusValue);
    if (m.minus) {
      if (m.minusValue == null) incomplete = true;
      else sums.set(m.minus, (sums.get(m.minus) ?? 0) - m.minusValue);
    }
    if (incomplete) missing++;
  }
  const totals = [...sums.entries()]
    .map(([key, value]) => ({ key, value: Math.round(value * 100) / 100 }))
    .filter((t) => t.value !== 0)
    .sort((a, b) => b.value - a.value);
  return { totals, missing };
}

/** Quantas medalhas dão cada buff / têm cada debuff. */
export function countStats(medals: Medal[]) {
  const plus = new Map<MedalStatKey, number>();
  const minus = new Map<MedalStatKey, number>();
  for (const m of medals) {
    plus.set(m.plus, (plus.get(m.plus) ?? 0) + 1);
    if (m.minus) minus.set(m.minus, (minus.get(m.minus) ?? 0) + 1);
  }
  return { plus, minus };
}

/** Ordem das chaves nos presets: por categoria e, dentro dela, a ordem em que aparecem. */
export function statsInCategory(keys: Iterable<MedalStatKey>, category: ReturnType<typeof statCategory>) {
  return [...keys].filter((k) => statCategory(k) === category);
}

export { formatNumber };
