import "server-only";
import { CLONE_NOTE_MAX, CLONE_TEAM_SIZE, type CloneDifficultyKey, type CloneTeam } from "@/config/guildClones";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSetupMissing } from "./boostData";
import { monthKey } from "./cloneMonth";

export const CLONE_SETUP_HINT = "Os times de clones ainda não estão prontos no banco. Rode o arquivo supabase/migrations/0013_guild_clones.sql no SQL Editor do Supabase e tente de novo.";

/** Erro "esperado" (regra do jogo, não bug): a mensagem já pode ir direto para o jogador. */
export class CloneError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DbError = { code?: string; message?: string };

function translate(e: DbError): CloneError {
  if (e.code === "23505") return new CloneError("Você já está em um time de clones neste mês. Cada jogador faz a missão só 1 vez por mês.", 409);
  if (e.code === "GC001") return new CloneError("Esse time acabou de fechar. Veja se há outro com vaga.", 409);
  if (e.code === "GC002") return new CloneError("Esse time não existe mais.", 404);
  if (e.code === "23503") return new CloneError("Sua conta não está mais na guilda. Entre de novo.", 401);
  if (isSetupMissing(e) || /guild_clone/i.test(e.message ?? "")) return new CloneError(CLONE_SETUP_HINT, 500);
  console.error("[clones]", e.code, e.message);
  return new CloneError("Não foi possível concluir. Tente de novo.", 500);
}

type TeamRow = { id: number; difficulty: CloneDifficultyKey; leader_id: number; note: string | null; created_at: string; discord_message_id: string | null };
type MemberRow = { team_id: number; member_id: number; joined_at: string };

/** Times do mês atual (abertos e fechados), com os nomes de quem está em cada um. Times de meses passados não aparecem. */
export async function listTeams(): Promise<{ teams: CloneTeam[]; memberTeam: Map<string, number> }> {
  const db = createAdminClient();
  const month = monthKey();
  const [teamsRes, membersRes, namesRes] = await Promise.all([
    db.from("guild_clone_teams").select("id, difficulty, leader_id, note, created_at, discord_message_id").eq("month_key", month).order("created_at", { ascending: true }),
    db.from("guild_clone_members").select("team_id, member_id, joined_at").eq("month_key", month).order("joined_at", { ascending: true }),
    db.from("guild_members").select("id, name"),
  ]);
  for (const res of [teamsRes, membersRes, namesRes]) if (res.error) throw translate(res.error);

  const names = new Map(((namesRes.data ?? []) as { id: number; name: string }[]).map((m) => [m.id, m.name]));
  const byTeam = new Map<number, string[]>();
  const memberTeam = new Map<string, number>();
  for (const row of (membersRes.data ?? []) as MemberRow[]) {
    const name = names.get(row.member_id);
    if (!name) continue;
    byTeam.set(row.team_id, [...(byTeam.get(row.team_id) ?? []), name]);
    memberTeam.set(String(row.member_id), row.team_id);
  }

  const teams = ((teamsRes.data ?? []) as TeamRow[]).map((t): CloneTeam => {
    const members = byTeam.get(t.id) ?? [];
    return { id: t.id, difficulty: t.difficulty, leader: names.get(t.leader_id) ?? "?", note: t.note, createdAt: t.created_at, members, full: members.length >= CLONE_TEAM_SIZE };
  });
  return { teams, memberTeam };
}

/** Time de um jogador neste mês (ou `null`). */
export async function teamOf(memberId: number): Promise<number | null> {
  const { data, error } = await createAdminClient().from("guild_clone_members").select("team_id").eq("member_id", memberId).eq("month_key", monthKey()).maybeSingle();
  if (error) throw translate(error);
  return (data as { team_id: number } | null)?.team_id ?? null;
}

export const cleanNote = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const text = value.normalize("NFC").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, CLONE_NOTE_MAX) : null;
};

export async function createTeam(memberId: number, difficulty: CloneDifficultyKey, note: string | null): Promise<number> {
  const { data, error } = await createAdminClient().rpc("create_guild_clone_team", { p_member_id: memberId, p_difficulty: difficulty, p_note: note });
  if (error) throw translate(error);
  return Number(data);
}

export async function joinTeam(memberId: number, teamId: number): Promise<void> {
  const { error } = await createAdminClient().rpc("join_guild_clone_team", { p_member_id: memberId, p_team_id: teamId });
  if (error) throw translate(error);
}

/** Devolve `true` se o time ficou vazio e foi apagado. */
export async function leaveTeam(memberId: number, teamId: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("leave_guild_clone_team", { p_member_id: memberId, p_team_id: teamId });
  if (error) throw translate(error);
  return data === true;
}

/** Só o líder cancela o time (todo mundo sai junto). Devolve o id da mensagem do Discord, para ela ser marcada como cancelada. */
export async function cancelTeam(memberId: number, teamId: number): Promise<{ messageId: string | null; difficulty: CloneDifficultyKey }> {
  const db = createAdminClient();
  const { data, error } = await db.from("guild_clone_teams").select("leader_id, discord_message_id, difficulty").eq("id", teamId).eq("month_key", monthKey()).maybeSingle();
  if (error) throw translate(error);
  const team = data as { leader_id: number; discord_message_id: string | null; difficulty: CloneDifficultyKey } | null;
  if (!team) throw new CloneError("Esse time não existe mais.", 404);
  if (team.leader_id !== memberId) throw new CloneError("Só quem criou o time pode cancelar.", 403);
  const { error: delError } = await db.from("guild_clone_teams").delete().eq("id", teamId);
  if (delError) throw translate(delError);
  return { messageId: team.discord_message_id, difficulty: team.difficulty };
}

export async function getTeam(teamId: number): Promise<(CloneTeam & { messageId: string | null }) | null> {
  const db = createAdminClient();
  const { data, error } = await db.from("guild_clone_teams").select("id, difficulty, leader_id, note, created_at, discord_message_id").eq("id", teamId).maybeSingle();
  if (error) throw translate(error);
  const row = data as TeamRow | null;
  if (!row) return null;
  const [membersRes, namesRes] = await Promise.all([
    db.from("guild_clone_members").select("member_id, joined_at").eq("team_id", teamId).order("joined_at", { ascending: true }),
    db.from("guild_members").select("id, name"),
  ]);
  for (const res of [membersRes, namesRes]) if (res.error) throw translate(res.error);
  const names = new Map(((namesRes.data ?? []) as { id: number; name: string }[]).map((m) => [m.id, m.name]));
  const members = ((membersRes.data ?? []) as { member_id: number }[]).flatMap((m) => (names.has(m.member_id) ? [names.get(m.member_id)!] : []));
  return { id: row.id, difficulty: row.difficulty, leader: names.get(row.leader_id) ?? "?", note: row.note, createdAt: row.created_at, members, full: members.length >= CLONE_TEAM_SIZE, messageId: row.discord_message_id };
}

export async function saveMessageId(teamId: number, messageId: string): Promise<void> {
  await createAdminClient().from("guild_clone_teams").update({ discord_message_id: messageId }).eq("id", teamId);
}
