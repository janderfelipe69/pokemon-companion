import { BALL_NAME_MAX, POKEMON_NAME_MAX, type BallCount, type BallData } from "@/config/guildBalls";

/**
 * Lê o texto copiado do jogo:
 *   Shiny Houndoom #229
 *   Ultra Ball: 492
 *   Moon Ball: 1.174
 * A primeira linha (sem ":") é o Pokémon; cada "Nome: quantidade" é um tipo de ball. Linhas "Total" são ignoradas.
 * Devolve `null` se não achou nem Pokémon nem balls.
 */
export function parseBallText(text: string): BallData | null {
  let pokemon = "";
  let number: number | null = null;
  let shiny = false;
  const byName = new Map<string, BallCount>();

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const ball = line.match(/^(.+?):\s*([\d.,]+)$/);
    if (ball) {
      const name = ball[1].trim().replace(/\s+/g, " ");
      if (/^total$/i.test(name) || name.length > BALL_NAME_MAX) continue;
      const qty = parseInt(ball[2].replace(/[.,]/g, ""), 10) || 0;
      const key = name.toLowerCase();
      const known = byName.get(key);
      if (known) known.qty += qty;
      else byName.set(key, { name, qty });
      continue;
    }

    if (!pokemon && !line.includes(":")) {
      const head = line.match(/^(.*?)\s*(?:#(\d+))?$/);
      shiny = /shiny/i.test(line);
      pokemon = (head?.[1] ?? line).replace(/^shiny\s+/i, "").trim().slice(0, POKEMON_NAME_MAX);
      number = head?.[2] ? Number(head[2]) : null;
    }
  }

  const balls = [...byName.values()];
  if (!pokemon || balls.length === 0) return null;
  return { pokemon, number: number && number <= 99999 ? number : null, shiny, balls };
}
