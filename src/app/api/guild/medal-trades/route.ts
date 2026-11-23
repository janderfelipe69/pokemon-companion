import { NextResponse } from "next/server";
import { listMembers } from "@/lib/guild/boostData";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { completeTrade, listOffers, listWants, MedalTradeError, setOffer, setWants, syncNotifications, unreadOthers } from "@/lib/guild/medalTradeData";
import { computeMatches, MAX_MEDAL_QTY } from "@/lib/guild/medalTrades";
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

/** Tudo da troca de medalhas: o que cada membro tem e quer, os membros e quem tem troca nova para o jogador logado. */
export async function GET() {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const [offers, wants, members, unread] = await Promise.all([listOffers(), listWants(), listMembers(), unreadOthers(me.id)]);
    return json({ me: { id: me.id, name: me.name }, members, offers, wants, unread });
  } catch (e) {
    return failAny(e);
  }
}

/**
 * Mexe nas listas do jogador logado:
 * `{ medalId, qty }` coloca, muda ou remove (qty 0) uma medalha que ele tem;
 * `{ wants: [medalIds] }` troca a lista de "quero" dele pela enviada.
 */
export async function PUT(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { medalId?: unknown; qty?: unknown; wants?: unknown } | null;
    const known = await medalIds();

    if (Array.isArray(body?.wants)) {
      const wants = [...new Set(body.wants as unknown[])];
      if (!wants.every((w): w is number => typeof w === "number" && Number.isInteger(w) && known.has(w))) return fail("Lista de medalhas inválida.");
      await setWants(me.id, wants);
    } else {
      const medalId = int(body?.medalId);
      const qty = int(body?.qty);
      if (medalId === null || !known.has(medalId)) return fail("Medalha desconhecida.");
      if (qty === null || qty < 0 || qty > MAX_MEDAL_QTY) return fail(`A quantidade vai de 0 a ${MAX_MEDAL_QTY}.`);
      await setOffer(me.id, medalId, qty);
    }
    await syncNotifications(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}

/** Troca feita: `{ action: "done", otherId, medalId, direction: "give" | "get", qty }`. A medalha diminui de quem entregou e sai do "quero" de quem recebeu. */
export async function POST(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { action?: unknown; otherId?: unknown; medalId?: unknown; direction?: unknown; qty?: unknown } | null;
    if (body?.action !== "done") return fail("Ação inválida.");

    const otherId = int(body.otherId);
    const medalId = int(body.medalId);
    const qty = int(body.qty);
    if (otherId === null || medalId === null || qty === null || qty < 1 || qty > MAX_MEDAL_QTY) return fail("Troca inválida.");
    if (body.direction !== "give" && body.direction !== "get") return fail("Direção inválida.");

    // Só vale para uma troca que o site mostra agora, na quantidade que o dono da medalha tem.
    const [offers, wants] = await Promise.all([listOffers(), listWants()]);
    const match = computeMatches(offers, wants, me.id).find((m) => m.otherId === otherId);
    const line = (body.direction === "give" ? match?.give : match?.get)?.find((l) => l.medalId === medalId);
    if (!line) return fail("Essa troca não existe mais. A tela vai atualizar.", 409);
    if (qty > line.qty) return fail(`Dá para trocar no máximo ${line.qty}.`, 409);

    // give: eu entrego a medalha; get: eu recebo. Os dois lados podem marcar como feita.
    await completeTrade(body.direction === "give" ? me.id : otherId, body.direction === "give" ? otherId : me.id, medalId, qty);
    await syncNotifications(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}
