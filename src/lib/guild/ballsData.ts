import "server-only";
import { BALL_HISTORY_LIMIT, BALL_MAX_KINDS, LUCKY_MAX_BALLS, ballSlug, ballTotal, type BallData, type BallProject, type CaptureInput, type CaptureStats } from "@/config/guildBalls";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSetupMissing } from "./boostData";

export const BALLS_SETUP_HINT = "Os projetos de balls ainda não estão prontos no banco. Rode os arquivos supabase/migrations/0014_guild_balls.sql e 0015_guild_balls_capture.sql (nessa ordem) no SQL Editor do Supabase e tente de novo.";

/** Erro "esperado": a mensagem já pode ir direto para o jogador. */
export class BallsError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DbError = { code?: string; message?: string };
const translate = (e: DbError): BallsError => {
  if (isSetupMissing(e) || /guild_ball/i.test(e.message ?? "")) return new BallsError(BALLS_SETUP_HINT, 500);
  if (e.code === "23503") return new BallsError("Sua conta não está mais na guilda. Entre de novo.", 401);
  console.error("[balls]", e.code, e.message);
  return new BallsError("Não foi possível concluir. Tente de novo.", 500);
};

type ProjectRow = {
  id: number; pokemon: string; dex_number: number | null; shiny: boolean; total: number; balls: BallData["balls"]; sprite: string | null;
  created_by: number | null; updated_by: number | null; created_at: string; updated_at: string;
  captured_at: string | null; captured_ball: string | null; captured_spent: number | null; captured_by: number | null;
};
type UpdateRow = { project_id: number; member_id: number | null; total: number; created_at: string };

/** Todos os projetos (o mais recentemente atualizado primeiro), cada um com o histórico de totais. */
export async function listProjects(): Promise<BallProject[]> {
  const db = createAdminClient();
  const [projects, updates, members] = await Promise.all([
    db.from("guild_ball_projects").select("id, pokemon, dex_number, shiny, total, balls, sprite, created_by, updated_by, created_at, updated_at, captured_at, captured_ball, captured_spent, captured_by").order("updated_at", { ascending: false }),
    db.from("guild_ball_updates").select("project_id, member_id, total, created_at").order("created_at", { ascending: false }).limit(1500),
    db.from("guild_members").select("id, name"),
  ]);
  for (const res of [projects, updates, members]) if (res.error) throw translate(res.error);

  const names = new Map(((members.data ?? []) as { id: number; name: string }[]).map((m) => [m.id, m.name]));
  const history = new Map<number, BallProject["history"]>();
  for (const u of (updates.data ?? []) as UpdateRow[]) {
    const list = history.get(u.project_id) ?? [];
    if (list.length < BALL_HISTORY_LIMIT) list.push({ total: Number(u.total), at: u.created_at, by: u.member_id ? (names.get(u.member_id) ?? null) : null });
    history.set(u.project_id, list);
  }

  return ((projects.data ?? []) as ProjectRow[]).map((p) => ({
    id: p.id, pokemon: p.pokemon, number: p.dex_number, shiny: p.shiny, balls: p.balls, total: Number(p.total), sprite: p.sprite,
    createdBy: p.created_by ? (names.get(p.created_by) ?? null) : null, updatedBy: p.updated_by ? (names.get(p.updated_by) ?? null) : null,
    createdAt: p.created_at, updatedAt: p.updated_at, history: history.get(p.id) ?? [],
    capture: p.captured_at && p.captured_ball ? { ball: p.captured_ball, spent: Number(p.captured_spent ?? 0), at: p.captured_at, by: p.captured_by ? (names.get(p.captured_by) ?? null) : null } : null,
  }));
}

export type SaveResult = { id: number; total: number; previousTotal: number | null; created: boolean };

/** Cria o projeto do Pokémon ou atualiza o que já existe (mesmo nome + número + shiny), e guarda a atualização no histórico. */
export async function saveProject(memberId: number, data: BallData, sprite: string | null): Promise<SaveResult> {
  const db = createAdminClient();
  const slug = ballSlug(data);
  const total = ballTotal(data.balls);
  const now = new Date().toISOString();

  const found = await db.from("guild_ball_projects").select("id, total").eq("slug", slug).maybeSingle();
  if (found.error) throw translate(found.error);
  const existing = found.data as { id: number; total: number } | null;

  let id: number;
  if (existing) {
    id = existing.id;
    const { error } = await db.from("guild_ball_projects").update({ pokemon: data.pokemon, dex_number: data.number, shiny: data.shiny, total, balls: data.balls, ...(sprite ? { sprite } : {}), updated_by: memberId, updated_at: now }).eq("id", id);
    if (error) throw translate(error);
  } else {
    const { data: created, error } = await db.from("guild_ball_projects").insert({ slug, pokemon: data.pokemon, dex_number: data.number, shiny: data.shiny, total, balls: data.balls, sprite, created_by: memberId, updated_by: memberId, updated_at: now }).select("id").single();
    if (error) throw translate(error);
    id = (created as { id: number }).id;
  }

  const { error: historyError } = await db.from("guild_ball_updates").insert({ project_id: id, member_id: memberId, total, balls: data.balls });
  if (historyError) throw translate(historyError);
  return { id, total, previousTotal: existing ? Number(existing.total) : null, created: !existing };
}

/** Só quem criou o projeto apaga (junto com o histórico). */
export async function deleteProject(memberId: number, id: number): Promise<void> {
  const db = createAdminClient();
  const found = await db.from("guild_ball_projects").select("created_by").eq("id", id).maybeSingle();
  if (found.error) throw translate(found.error);
  const row = found.data as { created_by: number | null } | null;
  if (!row) throw new BallsError("Esse projeto não existe mais.", 404);
  if (row.created_by !== memberId) throw new BallsError("Só quem criou o projeto pode apagar.", 403);
  const { error } = await db.from("guild_ball_projects").delete().eq("id", id);
  if (error) throw translate(error);
}


export type CaptureResult = { id: number; total: number; created: boolean; data: BallData; stats: CaptureStats | null };

/** Números da caça para o aviso do Discord. Se algo falhar, a captura já está salva: devolve `null` e o aviso sai sem eles. */
async function captureStats(id: number, createdAt: string | null, capturedAt: string, total: number): Promise<CaptureStats | null> {
  try {
    const db = createAdminClient();
    const [count, previous, updates] = await Promise.all([
      db.from("guild_ball_projects").select("id", { count: "exact", head: true }).not("captured_at", "is", null),
      db.from("guild_ball_projects").select("total").not("captured_at", "is", null).neq("id", id).order("total", { ascending: false }).limit(1),
      db.from("guild_ball_updates").select("id", { count: "exact", head: true }).eq("project_id", id),
    ]);
    if (count.error || previous.error || updates.error) return null;
    const best = (previous.data as { total: number }[] | null)?.[0]?.total;
    return {
      number: count.count ?? null,
      days: createdAt ? Math.max(0, Math.floor((Date.parse(capturedAt) - Date.parse(createdAt)) / 86_400_000)) : null,
      updates: Math.max(0, (updates.count ?? 1) - 1), // a linha da própria captura não conta
      record: best !== undefined && total > Number(best),
      lucky: total <= LUCKY_MAX_BALLS,
    };
  } catch {
    return null;
  }
}

/**
 * Encerra um projeto como capturado. A mensagem de captura é a palavra final sobre a ball usada:
 * a quantidade dessa ball no projeto passa a ser a que o jogo informou (e, se a ball ainda não estava no projeto, ela é incluída).
 * Sem projeto, cria um já encerrado com só essa ball. O projeto capturado sai do "slug" normal, para o mesmo Pokémon poder ter um projeto novo depois.
 */
export async function captureProject(memberId: number, input: CaptureInput, sprite: string | null): Promise<CaptureResult> {
  const db = createAdminClient();
  const now = new Date().toISOString();
  const capturedAt = input.capturedAt ?? now;
  let projectId = input.projectId;

  // O jogador não escolheu projeto: se já existe um aberto do mesmo Pokémon, usa ele em vez de duplicar.
  if (projectId === null) {
    const open = await db.from("guild_ball_projects").select("id").eq("slug", ballSlug(input)).is("captured_at", null).maybeSingle();
    if (open.error) throw translate(open.error);
    projectId = (open.data as { id: number } | null)?.id ?? null;
  }

  if (projectId !== null) {
    const found = await db.from("guild_ball_projects").select("id, slug, pokemon, dex_number, shiny, balls, captured_at, created_at").eq("id", projectId).maybeSingle();
    if (found.error) throw translate(found.error);
    const row = found.data as { id: number; slug: string; pokemon: string; dex_number: number | null; shiny: boolean; balls: BallData["balls"]; captured_at: string | null; created_at: string } | null;
    if (!row) throw new BallsError("Esse projeto não existe mais.", 404);
    if (row.captured_at) throw new BallsError("Esse projeto já foi marcado como capturado.", 409);

    const balls = row.balls.map((b) => ({ ...b }));
    const same = balls.find((b) => b.name.toLowerCase() === input.ball.toLowerCase());
    if (same) same.qty = input.spent;
    else if (balls.length >= BALL_MAX_KINDS) throw new BallsError("O projeto já tem balls demais para incluir mais uma.");
    else balls.push({ name: input.ball, qty: input.spent });
    const total = ballTotal(balls);

    const { error } = await db.from("guild_ball_projects").update({
      slug: `${row.slug}-c${row.id}`.slice(0, 80), balls, total, ...(sprite ? { sprite } : {}), captured_at: capturedAt, captured_ball: input.ball, captured_spent: input.spent,
      captured_by: memberId, updated_by: memberId, updated_at: now,
    }).eq("id", row.id);
    if (error) throw translate(error);
    const { error: historyError } = await db.from("guild_ball_updates").insert({ project_id: row.id, member_id: memberId, total, balls });
    if (historyError) throw translate(historyError);
    return { id: row.id, total, created: false, data: { pokemon: row.pokemon, number: row.dex_number, shiny: row.shiny, balls }, stats: await captureStats(row.id, row.created_at, capturedAt, total) };
  }

  const balls = [{ name: input.ball, qty: input.spent }];
  const slug = `${ballSlug(input)}-c${Date.now().toString(36)}`.slice(0, 80);
  const { data: created, error } = await db.from("guild_ball_projects").insert({
    slug, pokemon: input.pokemon, dex_number: input.number, shiny: input.shiny, total: input.spent, balls, sprite, created_by: memberId, updated_by: memberId, updated_at: now,
    captured_at: capturedAt, captured_ball: input.ball, captured_spent: input.spent, captured_by: memberId,
  }).select("id").single();
  if (error) throw translate(error);
  const id = (created as { id: number }).id;
  const { error: historyError } = await db.from("guild_ball_updates").insert({ project_id: id, member_id: memberId, total: input.spent, balls });
  if (historyError) throw translate(historyError);
  return { id, total: input.spent, created: true, data: { pokemon: input.pokemon, number: input.number, shiny: input.shiny, balls }, stats: await captureStats(id, null, capturedAt, input.spent) };
}
