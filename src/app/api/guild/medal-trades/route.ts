import { NextResponse } from "next/server";
import { listMembers } from "@/lib/guild/boostData";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { completeTrade, listListings, MedalTradeError, setListing, syncNotifications, unreadOthers } from "@/lib/guild/medalTradeData";
import { MAX_MEDAL_QTY } from "@/lib/guild/medalTrades";
import { getMedals } from "@/lib/supabase/medals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failAny = (e: unknown) => (e instanceof MedalTradeError ? fail(e.message, e.status) : fail("Erro interno na troca de medalhas.", 500));

const int = (value: unknown) => (typeof value === "number" && Number.isInteger(value) ? value : null);

async function knownMedal(id: number | null): Promise<boolean> {
  if (id === null || id < 1) return false;
  return (await getMedals()).medals.some((m) => m.id === id);
}

/** Todas as listas da guilda (quem tem e quem quer cada medalha) + os membros + quem tem match novo para o jogador logado. */
export async function GET() {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const [listings, members, unread] = await Promise.all([listListings(), listMembers(), unreadOthers(me.id)]);
    return json({ me: { id: me.id, name: me.name }, members, listings, unread });
  } catch (e) {
    return failAny(e);
  }
}

/** Define a quantidade de uma medalha na lista do jogador logado: `{ medalId, kind: "have" | "want", qty }` (qty 0 remove). */
export async function PUT(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { medalId?: unknown; kind?: unknown; qty?: unknown } | null;
    const medalId = int(body?.medalId);
    const qty = int(body?.qty);
    if (body?.kind !== "have" && body?.kind !== "want") return fail("Escolha a lista: tenho ou quero.");
    if (qty === null || qty < 0 || qty > MAX_MEDAL_QTY) return fail(`A quantidade vai de 0 a ${MAX_MEDAL_QTY}.`);
    if (medalId === null || !(await knownMedal(medalId))) return fail("Medalha desconhecida.");

    await setListing(me.id, medalId, body.kind, qty);
    await syncNotifications(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}

/** Troca feita: `{ action: "done", otherId, medalId, direction: "give" | "get", qty }`. A medalha some das duas listas (só a quantidade trocada). */
export async function POST(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { action?: unknown; otherId?: unknown; medalId?: unknown; direction?: unknown; qty?: unknown } | null;
    if (body?.action !== "done") return fail("Ação inválida.");

    const otherId = int(body.otherId);
    const medalId = int(body.medalId);
    const qty = int(body.qty);
    if (otherId === null || otherId === me.id || !(await listMembers()).some((m) => m.id === otherId)) return fail("Membro inválido.");
    if (medalId === null || !(await knownMedal(medalId))) return fail("Medalha desconhecida.");
    if (qty === null || qty < 1 || qty > MAX_MEDAL_QTY) return fail("Quantidade inválida.");
    if (body.direction !== "give" && body.direction !== "get") return fail("Direção inválida.");

    // give: eu entrego a medalha; get: eu recebo. Os dois lados podem marcar como feita.
    await completeTrade(body.direction === "give" ? me.id : otherId, body.direction === "give" ? otherId : me.id, medalId, qty);
    await syncNotifications(me.id);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}
