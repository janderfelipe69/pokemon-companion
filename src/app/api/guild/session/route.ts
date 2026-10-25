import { NextResponse } from "next/server";
import { GuildDataError, listMembers, listWants } from "@/lib/guild/boostData";
import { matchMember, normalizeNick } from "@/lib/guild/boostMembers";
import { createMemberSession, destroyMemberSession, getMemberSessionId, isMemberPasswordCorrect } from "@/lib/guild/boostSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const dataError = (e: unknown) => (e instanceof GuildDataError ? fail(e.message, 500) : fail("Erro interno ao consultar a guilda.", 500));

/** Quem está logado agora (ou `member: null`). */
export async function GET() {
  try {
    const id = await getMemberSessionId();
    if (!id) return json({ member: null, types: [] });
    const member = (await listMembers()).find((m) => m.id === id);
    if (!member) return json({ member: null, types: [] }); // o admin removeu esse membro
    return json({ member, types: (await listWants()).get(id) ?? [] });
  } catch (e) {
    return dataError(e);
  }
}

/** Entrar com nick e senha. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { nick?: unknown; password?: unknown } | null;
    const nick = typeof body?.nick === "string" ? normalizeNick(body.nick) : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!nick) return fail("Digite o seu nick.");

    const member = matchMember(nick, await listMembers());
    if (!member) return fail("Não achei esse nick na guilda. Confira como ele está escrito no jogo.", 404);
    if (!isMemberPasswordCorrect(password)) return fail("Senha incorreta.", 401);

    await createMemberSession(member.id);
    return json({ member, types: (await listWants()).get(member.id) ?? [] });
  } catch (e) {
    return dataError(e);
  }
}

/** Sair. */
export async function DELETE() {
  try {
    await destroyMemberSession();
    return json({ ok: true });
  } catch {
    return fail("Erro ao sair.", 500);
  }
}
