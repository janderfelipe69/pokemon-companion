import "server-only";
import { BALL_HISTORY_LIMIT, ballSlug, ballTotal, type BallData, type BallProject } from "@/config/guildBalls";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSetupMissing } from "./boostData";

export const BALLS_SETUP_HINT = "Os projetos de balls ainda não estão prontos no banco. Rode o arquivo supabase/migrations/0014_guild_balls.sql no SQL Editor do Supabase e tente de novo.";

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
};
type UpdateRow = { project_id: number; member_id: number | null; total: number; created_at: string };

/** Todos os projetos (o mais recentemente atualizado primeiro), cada um com o histórico de totais. */
export async function listProjects(): Promise<BallProject[]> {
  const db = createAdminClient();
  const [projects, updates, members] = await Promise.all([
    db.from("guild_ball_projects").select("id, pokemon, dex_number, shiny, total, balls, sprite, created_by, updated_by, created_at, updated_at").order("updated_at", { ascending: false }),
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
