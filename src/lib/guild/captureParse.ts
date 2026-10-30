import { BALL_NAME_MAX, POKEMON_NAME_MAX, baseSpecies, type BallCount } from "@/config/guildBalls";

/** O que a mensagem de captura do jogo diz. */
export type CaptureInfo = {
  pokemon: string;
  shiny: boolean;
  /** Todas as balls gastas na caça, com a quantidade de cada uma. */
  balls: BallCount[];
  /** Ball que fez a captura, quando a mensagem diz (título "Premier Catch" ou "Alliance Ball Catch"). `null` = a pessoa escolhe. */
  ball: string | null;
  /** As balls entre as quais a pessoa escolhe quando `ball` é `null` ("Rare Catch" tira Premier e Alliance da lista). */
  choices: string[];
  at: string | null;
};

const strip = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const titleCase = (text: string) => text.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

/** "119 Premier Balls, 1 Ultra Ball e 13 Sora Balls" → três balls. Itens que não entendo são ignorados. */
function parseBalls(segment: string): BallCount[] {
  const byName = new Map<string, BallCount>();
  // Vírgula só separa quando vem espaço depois: "1,234 Ultra Balls" é um número só.
  for (const item of segment.split(/,\s+|\s+e\s+|\s*&\s*/i)) {
    const m = item.trim().match(/^(\d[\d.,]*)\s*([A-Za-z][A-Za-z' -]{0,38}?)\s*$/);
    if (!m) continue;
    const qty = parseInt(m[1].replace(/[.,]/g, ""), 10);
    const name = m[2].trim().replace(/\s*balls?$/i, "").trim();
    if (!name || !Number.isFinite(qty) || qty < 1) continue;
    const full = `${titleCase(name)} Ball`;
    if (full.length > BALL_NAME_MAX) continue;
    const known = byName.get(full.toLowerCase());
    if (known) known.qty += qty;
    else byName.set(full.toLowerCase(), { name: full, qty });
  }
  return [...byName.values()];
}

/**
 * Lê a mensagem de captura, copiada como texto ou lida de uma imagem (OCR). Aceita estes formatos:
 *   Premier Catch
 *   Você capturou um Pokémon! (Shiny Ninetales). Você gastou: 685 Premier Balls.
 *   Eclipse | 28/10/2026 14:49:21
 * e também as linhas soltas do chat, sem título, com várias balls:
 *   09:28 Você capturou um Pokémon! (Shiny Pidgeot).
 *   09:28 Você gastou: 119 Premier Balls, 1 Ultra Ball e 13 Sora Balls.
 * Aceita sem acento e com pequenos erros de leitura. Devolve `null` se não achar o Pokémon e as balls gastas.
 */
export function parseCaptureText(raw: string): CaptureInfo | null {
  const text = strip(raw).replace(/\s+/g, " ");

  const caught = text.match(/captur\w*\s+um\s+pok\w*\s*[!.]?\s*\(\s*([^)]{2,80}?)\s*\)/i);
  const spent = text.match(/gast\w*\s*:?\s*(.+?)(?:\.(?!\d)|$)/i);
  if (!caught || !spent) return null;

  const shiny = /^shiny\s/i.test(caught[1]);
  const pokemon = caught[1].replace(/^shiny\s+/i, "").trim();
  const balls = parseBalls(spent[1]);
  if (!pokemon || pokemon.length > POKEMON_NAME_MAX || balls.length === 0) return null;

  // O título da mensagem diz com que ball foi: "Premier Catch" e "Alliance Ball Catch" são exatos;
  // "Rare Catch" é Ultra ou ball elemental (qualquer uma que não seja Premier nem Alliance).
  const names = balls.map((b) => b.name);
  let ball: string | null = null;
  let choices = names;
  if (/\bpremier\s+catch\b/i.test(text)) ball = names.find((n) => /^premier\b/i.test(n)) ?? null;
  else if (/\balliance(?:\s+ball)?\s+catch\b/i.test(text)) ball = names.find((n) => /^alliance\b/i.test(n)) ?? null;
  else if (/\brare\s+catch\b/i.test(text)) {
    const rest = names.filter((n) => !/^(premier|alliance)\b/i.test(n));
    if (rest.length > 0) choices = rest;
  }
  if (!ball && choices.length === 1) ball = choices[0];

  // Horário da mensagem (Brasília, UTC-3), se aparecer com a data.
  const d = text.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  const at = d ? new Date(`${d[3]}-${d[2]}-${d[1]}T${d[4]}:${d[5]}:${d[6] ?? "00"}-03:00`) : null;

  return { pokemon: titleCase(pokemon), shiny, balls, ball, choices, at: at && !Number.isNaN(at.getTime()) ? at.toISOString() : null };
}

/** Compara nomes de Pokémon sem acento, sem "Shiny" e sem pontuação. "Smeargle Flying" e "Smeargle" contam como o mesmo (ver `RANDOM_FORM_SPECIES`). */
export const sameName = (a: string, b: string) => {
  const key = (t: string) => strip(baseSpecies(t.replace(/^shiny\s+/i, ""))).toLowerCase().replace(/[^a-z0-9]/g, "");
  return key(a) === key(b);
};
