import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { markAllRead, MedalTradeError, unreadOthers } from "@/lib/guild/medalTradeData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const failAny = (e: unknown) => (e instanceof MedalTradeError ? json({ error: e.message }, e.status) : json({ error: "Erro interno nos avisos." }, 500));

/** Quantas pessoas têm um match novo (não visto) com o jogador logado. Alimenta o sino da guilda. */
export async function GET() {
  try {
    const me = await getCurrentMember();
    if (!me) return json({ error: "Entre com o seu nick primeiro." }, 401);
    const others = await unreadOthers(me.id);
    return json({ unread: others.length });
  } catch (e) {
    return failAny(e);
  }
}

/** Marca todos os avisos do jogador logado como vistos (ao abrir a aba de matches). */
export async function POST() {
  try {
    const me = await getCurrentMember();
    if (!me) return json({ error: "Entre com o seu nick primeiro." }, 401);
    await markAllRead(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}
