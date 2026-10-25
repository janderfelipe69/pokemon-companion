import { MAX_NICK_LENGTH } from "@/config/guildBoost";

/** Tira espaços sobrando: "  T  R U E " vira "T R U E". */
export const normalizeNick = (text: string) => text.normalize("NFC").replace(/\s+/g, " ").trim();

export const isValidNick = (nick: string) => nick.length >= 1 && nick.length <= MAX_NICK_LENGTH && !/[\u0000-\u001f<>]/.test(nick);

const lower = (text: string) => normalizeNick(text).toLowerCase();
const compact = (text: string) => lower(text).replace(/\s+/g, "");

/**
 * Acha o membro pelo nick digitado: primeiro igual (sem diferenciar maiúsculas); se não achar,
 * ignora os espaços ("TRUE" acha "T R U E"). Só devolve se houver um único candidato.
 */
export function matchMember<T extends { name: string }>(nick: string, members: readonly T[]): T | null {
  if (!normalizeNick(nick)) return null;
  const exact = members.filter((m) => lower(m.name) === lower(nick));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  const loose = members.filter((m) => compact(m.name) === compact(nick));
  return loose.length === 1 ? loose[0] : null;
}
