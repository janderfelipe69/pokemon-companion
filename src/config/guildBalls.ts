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

/** Projeto que fecha com até tantas balls ganha o selo "Sorte grande!" no Discord. */
export const LUCKY_MAX_BALLS = 100;

const BRASILIA_MS = -3 * 3600_000;
const dayNumber = (iso: string) => Math.floor((Date.parse(iso) + BRASILIA_MS) / 86_400_000);

/**
 * Dias de projeto, do primeiro post até a captura. O dia do primeiro post conta como dia 1
 * (começou e capturou no mesmo dia = 1 dia). Conta dias do calendário de Brasília, não blocos de 24 h.
 */
export function projectDays(startIso: string, endIso: string): number | null {
  if (Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso))) return null;
  return Math.max(1, dayNumber(endIso) - dayNumber(startIso) + 1);
}

/** "25/10", no calendário de Brasília. */
export function shortDate(iso: string): string {
  const d = new Date(Date.parse(iso) + BRASILIA_MS);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Números da caça, mostrados no aviso de captura do Discord. */
export type CaptureStats = {
  /** Quantas capturas a guilda já registrou (contando esta). */
  number: number | null;
  /** Dias de projeto, contando o dia do primeiro post como dia 1 (`null` se o projeto nasceu já capturado). */
  days: number | null;
  /** Quando saiu o primeiro post do projeto. */
  startedAt: string | null;
  /** Quantas atualizações o projeto teve antes da captura. */
  updates: number;
  /** Maior projeto (em balls) entre todos os já capturados. */
  record: boolean;
  lucky: boolean;
};

/** Como o projeto terminou: capturado, com qual ball e quantas balls foram gastas dessa ball. */
export type BallCapture = { ball: string; spent: number; at: string; by: string | null };

export type BallProject = BallData & {
  /** `null` = projeto em andamento. */
  capture: BallCapture | null;
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


/** O que o jogador confirma ao encerrar um projeto (já lido do texto ou da imagem da mensagem de captura). */
export type CaptureInput = { projectId: number | null; pokemon: string; number: number | null; shiny: boolean; ball: string; spent: number; capturedAt: string | null };

const cleanText = (value: string) => value.normalize("NFC").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();

/** Valida o que veio do navegador: `null` se algo estiver fora do formato. */
export function parseCaptureInput(value: unknown): CaptureInput | null {
  const v = (value ?? {}) as Record<string, unknown>;
  if (typeof v.pokemon !== "string" || typeof v.ball !== "string") return null;
  const pokemon = cleanText(v.pokemon).replace(/^shiny\s+/i, "");
  const ball = cleanText(v.ball);
  if (!pokemon || pokemon.length > POKEMON_NAME_MAX || !ball || ball.length > BALL_NAME_MAX) return null;
  if (!Number.isInteger(v.spent) || (v.spent as number) < 1 || (v.spent as number) > BALL_MAX_QTY) return null;
  const number = v.number === null || v.number === undefined ? null : Number.isInteger(v.number) && (v.number as number) >= 1 && (v.number as number) <= 99999 ? (v.number as number) : undefined;
  if (number === undefined) return null;
  const projectId = v.projectId === null || v.projectId === undefined ? null : Number.isInteger(v.projectId) && (v.projectId as number) > 0 ? (v.projectId as number) : undefined;
  if (projectId === undefined) return null;
  let capturedAt: string | null = null;
  if (typeof v.capturedAt === "string") {
    const time = Date.parse(v.capturedAt);
    // Aceita só datas plausíveis: nada no futuro (com folga de relógio) e nada de anos atrás.
    if (!Number.isNaN(time) && time <= Date.now() + 86_400_000 && time >= Date.now() - 400 * 86_400_000) capturedAt = new Date(time).toISOString();
  }
  return { projectId, pokemon, number, shiny: v.shiny === true, ball, spent: v.spent as number, capturedAt };
}
