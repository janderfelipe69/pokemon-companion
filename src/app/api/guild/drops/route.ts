import { after, NextResponse } from "next/server";
import { parseDrops } from "@/config/guildBoost";
import { GuildDataError, listDrops, listMembers, publishDrops } from "@/lib/guild/boostData";
import { roundEnd } from "@/lib/guild/boostRound";
import { getMemberSessionId } from "@/lib/guild/boostSession";
import { isDiscordConfigured, syncDiscordPlan } from "@/lib/guild/discord";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failData = (e: unknown) => (e instanceof GuildDataError ? fail(e.message, (e as { code?: string }).code === "23503" ? 401 : 500) : fail("Erro interno ao consultar os drops.", 500));

/** Quem publicou drop nesta rodada (até as 3h da manhã) e o que cada um tem. É o que alimenta o plano de trocas. */
export async function GET() {
  try {
    if (!(await getCurrentMember())) return fail("Entre com o seu nick primeiro.", 401);
    const [members, drops] = await Promise.all([listMembers(), listDrops()]);
    const names = new Map(members.map((m) => [m.id, m.name]));
    const posts = drops
      .filter((d) => names.has(d.memberId))
      .map((d) => ({
        name: names.get(d.memberId)!,
        postedAt: d.postedAt,
        expiresAt: roundEnd(new Date(d.postedAt)).toISOString(),
        stones: d.stones,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return json({ posts, discord: isDiscordConfigured() });
  } catch (e) {
    return failData(e);
  }
}

async function currentMemberId(): Promise<number | null> {
  const id = await getMemberSessionId();
  if (!id) return null;
  return (await listMembers()).some((m) => m.id === id) ? id : null;
}

/** Publica os drops do membro logado: `{ stones: [{ type, tier, qty }] }`. Substitui o que ele tinha publicado antes. */
export async function PUT(request: Request) {
  try {
    const id = await currentMemberId();
    if (!id) return fail("Entre com o seu nick primeiro.", 401);

    const body = (await request.json().catch(() => null)) as { stones?: unknown } | null;
    const stones = parseDrops(body?.stones);
    if (!stones || stones.length === 0) return fail("Lista de stones inválida.");

    await publishDrops(id, stones);
    after(() => syncDiscordPlan()); // avisa o Discord depois de responder; se falhar, a publicação já está salva
    return json({ ok: true });
  } catch (e) {
    return failData(e);
  }
}

/** Retira o que o membro logado tinha publicado. */
export async function DELETE() {
  try {
    const id = await currentMemberId();
    if (!id) return fail("Entre com o seu nick primeiro.", 401);
    await publishDrops(id, []);
    after(() => syncDiscordPlan());
    return json({ ok: true });
  } catch (e) {
    return failData(e);
  }
}
