import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { DiamondError, addOrder, addTrade, cancelOrder, deleteClosedCycle, deleteOrder, deleteTrade, fillOrder, listAll, resetCycle, updateOrder, updateTrade, type TradeInput } from "@/lib/diamondData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failAny = (e: unknown) => (e instanceof DiamondError ? fail(e.message, e.status) : fail("Erro interno no controle de diamantes.", 500));

/** O texto que a pessoa precisa digitar para reiniciar. A tela pede; o servidor confere de novo. */
const RESET_WORD = "REINICIAR";

const MAX_QTY = 1_000_000;
const MAX_PRICE = 1_000_000_000_000;

const id = (value: unknown) => (Number.isInteger(value) && (value as number) > 0 ? (value as number) : null);

/** Valida o lançamento vindo da tela. Devolve o erro em texto ou o lançamento limpo. */
function parseTrade(body: Record<string, unknown>): TradeInput | string {
  if (body.kind !== "buy" && body.kind !== "sell") return "Escolha se é compra ou venda.";
  if (!Number.isInteger(body.quantity) || (body.quantity as number) < 1 || (body.quantity as number) > MAX_QTY) return "A quantidade de diamantes precisa ser um número inteiro de 1 em diante.";
  if (!Number.isInteger(body.unitPrice) || (body.unitPrice as number) < 0 || (body.unitPrice as number) > MAX_PRICE) return "O preço de cada diamante é inválido.";

  let tradedAt: string | null = null;
  if (typeof body.tradedAt === "string" && body.tradedAt) {
    const time = Date.parse(body.tradedAt);
    // Nada no futuro (com folga de relógio) e nada de antes de 2020.
    if (Number.isNaN(time) || time > Date.now() + 86_400_000 || time < Date.parse("2020-01-01")) return "A data do lançamento é inválida.";
    tradedAt = new Date(time).toISOString();
  }
  const note = typeof body.note === "string" ? body.note.normalize("NFC").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120) : "";
  return { kind: body.kind, quantity: body.quantity as number, unitPrice: body.unitPrice as number, tradedAt, note: note || null };
}

/** Ciclos e lançamentos. Só o admin. */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return fail("Não autorizado.", 401);
    return json(await listAll());
  } catch (e) {
    return failAny(e);
  }
}

/**
 * Ações do admin: `add`, `update` (id + campos), `delete` (id), `reset` (carry + confirm) e `delete-cycle` (id);
 * e as da solicitação: `order-add`, `order-update`, `order-fill`, `order-cancel` e `order-delete`.
 */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return fail("Não autorizado.", 401);
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return fail("Envio inválido.");

    switch (body.action) {
      case "add": {
        const trade = parseTrade(body);
        if (typeof trade === "string") return fail(trade);
        await addTrade(trade);
        return json({ ok: true });
      }
      case "update": {
        const tradeId = id(body.id);
        const trade = parseTrade(body);
        if (!tradeId) return fail("Lançamento inválido.");
        if (typeof trade === "string") return fail(trade);
        await updateTrade(tradeId, trade);
        return json({ ok: true });
      }
      case "delete": {
        const tradeId = id(body.id);
        if (!tradeId) return fail("Lançamento inválido.");
        await deleteTrade(tradeId);
        return json({ ok: true });
      }
      case "reset": {
        if (body.confirm !== RESET_WORD) return fail(`Para reiniciar, confirme digitando ${RESET_WORD}.`);
        await resetCycle(body.carry === true);
        return json({ ok: true });
      }
      case "order-add": {
        const order = parseTrade(body);
        if (typeof order === "string") return fail(order);
        await addOrder({ kind: order.kind, quantity: order.quantity, unitPrice: order.unitPrice, note: order.note });
        return json({ ok: true });
      }
      case "order-update": {
        const orderId = id(body.id);
        const order = parseTrade(body);
        if (!orderId) return fail("Solicitação inválida.");
        if (typeof order === "string") return fail(order);
        await updateOrder(orderId, { quantity: order.quantity, unitPrice: order.unitPrice, note: order.note });
        return json({ ok: true });
      }
      case "order-fill": {
        const orderId = id(body.id);
        const fill = parseTrade({ ...body, kind: "buy" }); // o tipo da solicitação é o do banco; aqui só validamos quantidade, preço e data
        if (!orderId) return fail("Solicitação inválida.");
        if (typeof fill === "string") return fail(fill);
        await fillOrder(orderId, fill.quantity, fill.unitPrice, fill.tradedAt);
        return json({ ok: true });
      }
      case "order-cancel": {
        const orderId = id(body.id);
        if (!orderId) return fail("Solicitação inválida.");
        await cancelOrder(orderId);
        return json({ ok: true });
      }
      case "order-delete": {
        const orderId = id(body.id);
        if (!orderId) return fail("Solicitação inválida.");
        await deleteOrder(orderId);
        return json({ ok: true });
      }
      case "delete-cycle": {
        const cycleId = id(body.id);
        if (!cycleId) return fail("Ciclo inválido.");
        await deleteClosedCycle(cycleId);
        return json({ ok: true });
      }
      default:
        return fail("Ação inválida.");
    }
  } catch (e) {
    return failAny(e);
  }
}
