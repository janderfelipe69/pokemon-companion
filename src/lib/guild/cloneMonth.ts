// Mês de Brasília (UTC-3 o ano todo, sem horário de verão). Fixar o deslocamento evita depender do fuso do servidor.
const BRASILIA_OFFSET_MS = -3 * 3600_000;

/** "2026-10": o mês de Brasília em que `date` cai. Tem de bater com `guild_clone_month()` no banco. */
export function monthKey(date: Date = new Date()): string {
  const local = new Date(date.getTime() + BRASILIA_OFFSET_MS);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Quando os times do mês atual deixam de valer: dia 1 do mês seguinte, 00h de Brasília. */
export function monthResetAt(date: Date = new Date()): Date {
  const local = new Date(date.getTime() + BRASILIA_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) - BRASILIA_OFFSET_MS);
}
