import { DROP_CUTOFF_HOUR } from "@/config/guildBoost";

// Brasília é UTC-3 o ano todo (o Brasil não usa mais horário de verão). Fixar o deslocamento evita depender
// do fuso do servidor: a Vercel roda em UTC e o corte cairia na hora errada.
const BRASILIA_OFFSET_MS = -3 * 3600_000;
const DAY_MS = 24 * 3600_000;

/**
 * Quando o drop publicado em `postedAt` some: às 3h da manhã (Brasília) seguinte.
 * Domingo 22h → segunda 3h. Segunda 1h → segunda 3h. Quem publica na mesma rodada some junto.
 */
export function roundEnd(postedAt: Date): Date {
  const local = postedAt.getTime() + BRASILIA_OFFSET_MS; // os campos UTC desta data são o relógio de Brasília
  const day = new Date(local);
  const cutoff = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), DROP_CUTOFF_HOUR);
  return new Date((local < cutoff ? cutoff : cutoff + DAY_MS) - BRASILIA_OFFSET_MS);
}

export const isRoundActive = (postedAt: Date, now: Date = new Date()) => roundEnd(postedAt).getTime() > now.getTime();
