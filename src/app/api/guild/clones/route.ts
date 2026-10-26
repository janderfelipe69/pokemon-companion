import { after, NextResponse } from "next/server";
import { CLONE_TEAM_SIZE, isCloneDifficulty } from "@/config/guildClones";
import { CloneError, cancelTeam, cleanNote, createTeam, getTeam, joinTeam, leaveTeam, listTeams, teamOf } from "@/lib/guild/cloneData";
import { isCloneDiscordConfigured, syncCloneDiscord } from "@/lib/guild/cloneDiscord";
import { monthKey, monthResetAt } from "@/lib/guild/cloneMonth";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { GuildDataError } from "@/lib/guild/boostData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failAny = (e: unknown) => (e instanceof CloneError || e instanceof GuildDataError ? fail(e.message, e instanceof CloneError ? e.status : 500) : fail("Erro interno nos times de clones.", 500));

const teamId = (value: unknown) => (Number.isInteger(value) && (value as number) > 0 ? (value as number) : null);

/** Times do mês e em qual deles o jogador logado está. Só para membros. */
export async function GET() {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const { teams, memberTeam } = await listTeams();
    return json({
      me: me.name,
      myTeamId: memberTeam.get(String(me.id)) ?? null,
      teams,
      month: monthKey(),
      resetAt: monthResetAt().toISOString(),
      teamSize: CLONE_TEAM_SIZE,
      discord: isCloneDiscordConfigured(),
    });
  } catch (e) {
    return failAny(e);
  }
}

/**
 * Ações do jogador logado, todas em um só lugar:
 * `{ action: "create", difficulty, note? }`, `{ action: "join", teamId }`, `{ action: "leave", teamId }`, `{ action: "cancel", teamId }`.
 */
export async function POST(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { action?: unknown; difficulty?: unknown; note?: unknown; teamId?: unknown } | null;

    if (body?.action === "create") {
      if (!isCloneDifficulty(body.difficulty)) return fail("Escolha a dificuldade: Easy, Medium ou Hard.");
      const id = await createTeam(me.id, body.difficulty, cleanNote(body.note));
      after(() => syncCloneDiscord(id, { kind: "created" })); // avisa o Discord depois de responder; se falhar, o time já está salvo
      return json({ ok: true, teamId: id });
    }

    const id = teamId(body?.teamId);
    if (!id) return fail("Time inválido.");

    if (body?.action === "join") {
      await joinTeam(me.id, id);
      after(() => syncCloneDiscord(id, { kind: "joined" }));
      return json({ ok: true });
    }

    if (body?.action === "leave") {
      if ((await teamOf(me.id)) !== id) return fail("Você não está nesse time.", 409);
      const before = await getTeam(id);
      const deleted = await leaveTeam(me.id, id);
      if (deleted && before) after(() => syncCloneDiscord(id, { kind: "cancelled" }, { team: before, messageId: before.messageId }));
      else after(() => syncCloneDiscord(id, { kind: "left" }));
      return json({ ok: true, deleted });
    }

    if (body?.action === "cancel") {
      const before = await getTeam(id);
      const { messageId } = await cancelTeam(me.id, id);
      if (before) after(() => syncCloneDiscord(id, { kind: "cancelled" }, { team: before, messageId }));
      return json({ ok: true });
    }

    return fail("Ação inválida.");
  } catch (e) {
    return failAny(e);
  }
}
