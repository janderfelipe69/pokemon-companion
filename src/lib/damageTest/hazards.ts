/** Dano (em k) que cada time precisa bater em cada hazard. Os hazards 6 a 9 e 16 são estimados. */
export const HAZARD_DAMAGE: Readonly<Record<number, number>> = {
  0: 560, 1: 578, 2: 596, 3: 614, 4: 632, 5: 650, 6: 663, 7: 676, 8: 689,
  9: 702, 10: 715, 11: 730, 12: 740, 13: 755, 14: 765, 15: 780, 16: 812, 17: 845,
};

export const HAZARDS: readonly number[] = Object.keys(HAZARD_DAMAGE).map(Number).sort((a, b) => a - b);

export const ESTIMATED_HAZARDS: ReadonlySet<number> = new Set([6, 7, 8, 9, 16]);

export const requiredDamage = (hazard: number): number => HAZARD_DAMAGE[hazard] ?? 0;

/** Drops liberados: Legend a partir do hazard 5 e Mythic a partir do 10. */
export const dropsFor = (hazard: number): string => (hazard >= 10 ? "Legend + Mythic" : hazard >= 5 ? "Legend" : "—");

export const precisionFor = (hazard: number): number => (hazard < 5 ? 0 : 5 * (hazard - 4));

/** "+15%", "-3%"… (vírgula decimal; 0 vira "0%"). */
export const signedPercent = (value: number, sign: "+" | "-"): string => (value ? `${sign}${String(value).replace(".", ",")}%` : "0%");

/** Cada nível de hazard soma o mesmo padrão de efeitos. */
export function effectsOf(hazard: number) {
  return {
    damageDealt: signedPercent(3 * hazard, "-"),
    damageTaken: signedPercent(5 * hazard, "+"),
    crit: signedPercent(hazard, "-"),
    critTaken: signedPercent(hazard, "+"),
    xp: signedPercent(5 * hazard, "+"),
    loot: signedPercent(0.5 * hazard, "+"),
  };
}
