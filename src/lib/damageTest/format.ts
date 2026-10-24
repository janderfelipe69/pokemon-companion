export const round1 = (x: number): number => Math.round(x * 10) / 10;

/** "5,5" (vírgula decimal, no máximo 1 casa). */
export const fmtNum = (x: number): string => String(round1(x)).replace(".", ",");

/** "290k", "12,5k". */
export const fmtK = (x: number): string => `${fmtNum(x)}k`;

/** "+12,5k" / "-3k" (o sinal sempre aparece). */
export const fmtSignedK = (x: number): string => `${x >= 0 ? "+" : "-"}${fmtNum(Math.abs(x))}k`;
