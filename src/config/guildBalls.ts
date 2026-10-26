/** Projetos de balls da guilda: limites e tipos compartilhados entre a tela e a API. */
export const BALL_MAX_KINDS = 40;
export const BALL_MAX_QTY = 999_999_999;
export const BALL_NAME_MAX = 40;
export const POKEMON_NAME_MAX = 60;
export const BALL_HISTORY_LIMIT = 30;
export const BALL_IMAGE_MAX_BYTES = 3_500_000;

export type BallCount = { name: string; qty: number };

/** O que o texto colado do jogo diz: Pokémon, número da dex e quantas balls de cada tipo. */
export type BallData = { pokemon: string; number: number | null; shiny: boolean; balls: BallCount[] };

export type BallHistoryEntry = { total: number; at: string; by: string | null };

export type BallProject = BallData & {
  id: number;
  total: number;
  /** Arte enviada à mão (data URL). `null` = usar a arte oficial pelo número. */
  sprite: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Da atualização mais recente para a mais antiga. */
  history: BallHistoryEntry[];
};

export const ballTotal = (balls: readonly BallCount[]) => balls.reduce((n, b) => n + b.qty, 0);

/** Identificador estável do projeto: "shiny-houndoom-229". Atualizar o mesmo Pokémon cai no mesmo projeto. */
export function ballSlug(data: Pick<BallData, "pokemon" | "number" | "shiny">): string {
  const base = data.pokemon
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^shiny\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${data.shiny ? "shiny-" : ""}${base || "pokemon"}${data.number ? `-${data.number}` : ""}`.slice(0, 80);
}

/** Limpa o que veio do navegador: `null` se algo estiver fora do formato. O total é sempre recalculado no servidor. */
export function parseBallData(value: unknown): BallData | null {
  const v = (value ?? {}) as { pokemon?: unknown; number?: unknown; shiny?: unknown; balls?: unknown };
  if (typeof v.pokemon !== "string" || !Array.isArray(v.balls)) return null;
  const pokemon = v.pokemon.normalize("NFC").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().replace(/^shiny\s+/i, "");
  if (!pokemon || pokemon.length > POKEMON_NAME_MAX) return null;
  const number = v.number === null || v.number === undefined ? null : Number.isInteger(v.number) && (v.number as number) >= 1 && (v.number as number) <= 99999 ? (v.number as number) : undefined;
  if (number === undefined) return null;
  if (v.balls.length === 0 || v.balls.length > BALL_MAX_KINDS) return null;

  const seen = new Set<string>();
  const balls: BallCount[] = [];
  for (const item of v.balls) {
    const { name, qty } = (item ?? {}) as { name?: unknown; qty?: unknown };
    if (typeof name !== "string" || !Number.isInteger(qty) || (qty as number) < 0 || (qty as number) > BALL_MAX_QTY) return null;
    const clean = name.normalize("NFC").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
    if (!clean || clean.length > BALL_NAME_MAX || seen.has(clean.toLowerCase())) return null;
    seen.add(clean.toLowerCase());
    balls.push({ name: clean, qty: qty as number });
  }
  return { pokemon, number, shiny: v.shiny === true, balls };
}
