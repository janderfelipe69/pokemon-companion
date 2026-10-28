import { BALL_NAME_MAX, POKEMON_NAME_MAX } from "@/config/guildBalls";

/** O que a mensagem de captura do jogo diz. */
export type CaptureInfo = { pokemon: string; shiny: boolean; ball: string; spent: number; at: string | null };

const strip = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const titleCase = (text: string) => text.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/**
 * Lê a mensagem de captura, copiada como texto ou lida de uma imagem (OCR):
 *   Premier Catch
 *   TRUE
 *   Você capturou um Pokémon! (Shiny Ninetales). Você gastou: 685 Premier Balls.
 *   Eclipse | 28/10/2026 14:49:21
 * Aceita sem acento e com pequenos erros de leitura. Devolve `null` se não achar o Pokémon e as balls gastas.
 */
export function parseCaptureText(raw: string): CaptureInfo | null {
  const text = strip(raw).replace(/\s+/g, " ");

  const caught = text.match(/captur\w*\s+um\s+pok\w*\s*[!.]?\s*\(\s*([^)]{2,80}?)\s*\)/i);
  const spent = text.match(/gast\w*\s*:?\s*([\d][\d.,\s]*?)\s*([A-Za-z][A-Za-z' -]{1,40}?)\s*\./i);
  if (!caught || !spent) return null;

  const shiny = /^shiny\s/i.test(caught[1]);
  const pokemon = caught[1].replace(/^shiny\s+/i, "").trim();
  const qty = parseInt(spent[1].replace(/[.,\s]/g, ""), 10);
  const ballName = spent[2].trim().replace(/\s*balls?$/i, "").trim();
  if (!pokemon || pokemon.length > POKEMON_NAME_MAX || !Number.isFinite(qty) || qty < 1 || !ballName) return null;
  const ball = `${titleCase(ballName)} Ball`;
  if (ball.length > BALL_NAME_MAX) return null;

  // Horário da mensagem (Brasília, UTC-3), se aparecer.
  const d = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  const at = d ? new Date(`${d[3]}-${d[2]}-${d[1]}T${d[4]}:${d[5]}:${d[6] ?? "00"}-03:00`) : null;

  return { pokemon: titleCase(pokemon), shiny, ball, spent: qty, at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null };
}

/** Compara nomes de Pokémon sem acento, sem "Shiny" e sem pontuação. */
export const sameName = (a: string, b: string) => {
  const key = (t: string) => strip(t).toLowerCase().replace(/^shiny\s+/, "").replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
};
