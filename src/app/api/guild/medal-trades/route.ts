import { NextResponse } from "next/server";
import { listMembers } from "@/lib/guild/boostData";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { completeTrade, listOffers, MedalTradeError, setOffer, setWants, syncNotifications, unreadOthers } from "@/lib/guild/medalTradeData";
import { candidatesFor, MAX_MEDAL_QTY, MAX_WANTS } from "@/lib/guild/medalTrades";
import { getMedals } from "@/lib/supabase/medals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failAny = (e: unknown) => (e instanceof MedalTradeError ? fail(e.message, e.status) : fail("Erro interno na troca de medalhas.", 500));

const int = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? value : null);

async function medalIds(): Promise<Set<number>> {
  return new Set((await getMedals()).medals.map((m) => m.id));
}

/** Todas as ofertas da guilda (cada uma com o que aceita em troca) + os membros + quem tem troca nova para o jogador logado. */
export async function GET() {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const [offers, members, unread] = await Promise.all([listOffers(), listMembers(), unreadOthers(me.id)]);
    return json({ me: { id: me.id, name: me.name }, members, offers, unread });
  } catch (e) {
    return failAny(e);
  }
}

/**
 * Mexe nas ofertas do jogador logado:
 * `{ medalId, qty }` coloca, muda ou remove (qty 0) uma medalha para trocar;
 * `{ medalId, wants: [medalIds] }` define o que ele aceita em troca daquela oferta.
 */
export async function PUT(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { medalId?: unknown; qty?: unknown; wants?: unknown } | null;
    const medalId = int(body?.medalId);
    const known = await medalIds();
    if (medalId === null || !known.has(medalId)) return fail("Medalha desconhecida.");

    if (Array.isArray(body?.wants)) {
      const wants = [...new Set(body.wants as unknown[])];
      if (wants.length > MAX_WANTS) return fail(`No máximo ${MAX_WANTS} medalhas aceitas em troca.`);
      if (!wants.every((w): w is number => typeof w === "number" && Number.isInteger(w) && known.has(w))) return fail("Lista de medalhas inválida.");
      await setWants(me.id, medalId, wants);
    } else {
      const qty = int(body?.qty);
      if (qty === null || qty < 0 || qty > MAX_MEDAL_QTY) return fail(`A quantidade vai de 0 a ${MAX_MEDAL_QTY}.`);
      await setOffer(me.id, medalId, qty);
    }
    await syncNotifications(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}

/** Troca feita: `{ action: "done", otherId, myMedalId, theirMedalId, qty }`. As duas ofertas diminuem (e somem se chegarem a 0). */
export async function POST(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { action?: unknown; otherId?: unknown; myMedalId?: unknown; theirMedalId?: unknown; qty?: unknown } | null;
    if (body?.action !== "done") return fail("Ação inválida.");

    const otherId = int(body.otherId);
    const myMedalId = int(body.myMedalId);
    const theirMedalId = int(body.theirMedalId);
    const qty = int(body.qty);
    if (otherId === null || myMedalId === null || theirMedalId === null || qty === null || qty < 1 || qty > MAX_MEDAL_QTY) return fail("Troca inválida.");

    // Só vale entre duas ofertas que existem e que combinam (pelo menos um lado aceita o outro), na quantidade possível.
    const offers = await listOffers();
    const mine = offers.find((o) => o.memberId === me.id && o.medalId === myMedalId);
    const match = mine && candidatesFor(offers, mine).find((c) => c.otherId === otherId && c.theirMedalId === theirMedalId);
    if (!match) return fail("Essa troca não existe mais. A tela vai atualizar.", 409);
    if (qty > match.qty) return fail(`Dá para trocar no máximo ${match.qty}.`, 409);

    await completeTrade(me.id, myMedalId, otherId, theirMedalId, qty);
    await syncNotifications(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}
