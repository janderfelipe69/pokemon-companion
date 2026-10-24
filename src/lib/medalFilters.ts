import { MEDAL_STATS, type Medal, type MedalStatKey } from "@/data/medals";

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

export function filterMedals(medals: Medal[], f: MedalFilters): Medal[] {
  const q = normalize(f.query);
  return medals.filter((m) => {
    if (f.plus.length > 0 && !f.plus.includes(m.plus)) return false;
    if (f.noDebuff && m.minus !== null) return false;
    if (m.minus !== null && f.avoid.includes(m.minus)) return false;
    if (q) {
      const haystack = normalize(
        `${m.id} ${m.name} ${MEDAL_STATS[m.plus].label} ${m.minus ? MEDAL_STATS[m.minus].label : "sem debuff"}`,
      );
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export type StatTotal = { key: MedalStatKey; value: number };

/** Soma líquida por buff (cada medalha = +1 no buff e −1 no debuff). Ignora o que fica em zero. */
export function computeTotals(medals: Medal[]): StatTotal[] {
  const sums = new Map<MedalStatKey, number>();
  for (const m of medals) {
    sums.set(m.plus, (sums.get(m.plus) ?? 0) + 1);
    if (m.minus) sums.set(m.minus, (sums.get(m.minus) ?? 0) - 1);
  }
  return [...sums.entries()]
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);
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
