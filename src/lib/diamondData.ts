import "server-only";
import { computeLedger, type Order, type OrderStatus, type Trade, type TradeKind } from "@/lib/diamonds";
import { isSetupMissing } from "@/lib/guild/boostData";
import { createAdminClient } from "@/lib/supabase/admin";

export const DIAMOND_SETUP_HINT = "O controle de diamantes ainda não está pronto no banco. Rode os arquivos supabase/migrations/0017_diamond_ledger.sql, 0019_diamond_orders.sql e 0020_diamond_orders_apply.sql (nessa ordem) no SQL Editor do Supabase e tente de novo.";

/** Erro "esperado": a mensagem já pode ir direto para a tela. */
export class DiamondError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DbError = { code?: string; message?: string };
const translate = (e: DbError): DiamondError => {
  if (e.code === "DO001") return new DiamondError("Essa solicitação não está mais aberta.", 409);
  if (e.code === "DO002") return new DiamondError("A quantidade é maior do que falta nessa solicitação.", 400);
  if (e.code === "DO003") return new DiamondError("O preço informado é inválido.", 400);
  if (e.code === "DO004") return new DiamondError("Escolha se é compra ou venda.", 400);
  if (e.code === "DO005") return new DiamondError("Não há balanço aberto. Recarregue a página.", 409);
  if (e.code === "DO006") return new DiamondError("Essa quantidade passa do que a solicitação de origem tem. Ajuste a solicitação primeiro.", 400);
  if (e.code === "DO007") return new DiamondError("Esse lançamento veio de uma solicitação, então não dá para trocar entre compra e venda.", 400);
  if (e.code === "DO008") return new DiamondError("Esse lançamento não existe mais.", 404);
  if (isSetupMissing(e) || /diamond_|order_id|add_diamond_trade|update_diamond_trade|delete_diamond_trade/i.test(e.message ?? "")) return new DiamondError(DIAMOND_SETUP_HINT, 500);
  console.error("[diamonds]", e.code, e.message);
  return new DiamondError("Não foi possível concluir. Tente de novo.", 500);
};

export type Cycle = { id: number; startedAt: string; endedAt: string | null };

type TradeRow = { id: number; cycle_id: number; kind: TradeKind; quantity: number; unit_price: number; traded_at: string; note: string | null; order_id?: number | null };
const toTrade = (r: TradeRow): Trade => ({ id: r.id, cycleId: r.cycle_id, kind: r.kind, quantity: r.quantity, unitPrice: Number(r.unit_price), tradedAt: r.traded_at, note: r.note, orderId: r.order_id ?? null });

type OrderRow = { id: number; cycle_id: number; kind: "buy" | "sell"; quantity: number; filled: number; unit_price: number; initial_price: number; status: OrderStatus; note: string | null; created_at: string; closed_at: string | null };
const ORDER_COLUMNS = "id, cycle_id, kind, quantity, filled, unit_price, initial_price, status, note, created_at, closed_at";
const toOrder = (r: OrderRow): Order => ({ id: r.id, cycleId: r.cycle_id, kind: r.kind, quantity: r.quantity, filled: r.filled, unitPrice: Number(r.unit_price), initialPrice: Number(r.initial_price), status: r.status, note: r.note, createdAt: r.created_at, closedAt: r.closed_at });

/** O ciclo aberto. Se ainda não existe nenhum (primeiro uso), cria. */
export async function ensureOpenCycle(): Promise<Cycle> {
  const db = createAdminClient();
  const read = async () => {
    const { data, error } = await db.from("diamond_cycles").select("id, started_at, ended_at").is("ended_at", null).maybeSingle();
    if (error) throw translate(error);
    return data as { id: number; started_at: string; ended_at: string | null } | null;
  };
  let row = await read();
  if (!row) {
    const { error } = await db.from("diamond_cycles").insert({ started_at: new Date().toISOString() });
    if (error && error.code !== "23505") throw translate(error); // 23505 = outro pedido criou ao mesmo tempo
    row = await read();
  }
  if (!row) throw new DiamondError("Não foi possível abrir o ciclo.", 500);
  return { id: row.id, startedAt: row.started_at, endedAt: row.ended_at };
}

/** Todos os ciclos (o mais novo primeiro) e todos os lançamentos. É pouco dado, então vai tudo de uma vez e a tela filtra. */
export async function listAll(): Promise<{ cycles: Cycle[]; trades: Trade[]; orders: Order[] }> {
  await ensureOpenCycle();
  const db = createAdminClient();
  const [cycles, trades, orders] = await Promise.all([
    db.from("diamond_cycles").select("id, started_at, ended_at").order("id", { ascending: false }),
    db.from("diamond_trades").select("id, cycle_id, kind, quantity, unit_price, traded_at, note, order_id").order("traded_at", { ascending: true }).order("id", { ascending: true }).limit(20000),
    db.from("diamond_orders").select(ORDER_COLUMNS).order("id", { ascending: false }).limit(5000),
  ]);
  for (const res of [cycles, trades, orders]) if (res.error) throw translate(res.error);
  return {
    cycles: ((cycles.data ?? []) as { id: number; started_at: string; ended_at: string | null }[]).map((c) => ({ id: c.id, startedAt: c.started_at, endedAt: c.ended_at })),
    trades: ((trades.data ?? []) as TradeRow[]).map(toTrade),
    orders: ((orders.data ?? []) as OrderRow[]).map(toOrder),
  };
}

export type TradeInput = { kind: "buy" | "sell"; quantity: number; unitPrice: number; tradedAt: string | null; note: string | null };

/**
 * Registra uma compra ou venda. Com `apply` (o padrão da tela), o que foi negociado é descontado das solicitações abertas
 * do mesmo tipo. Devolve quantos dd foram descontados de solicitações.
 */
export async function addTrade(input: TradeInput, apply: boolean): Promise<number> {
  await ensureOpenCycle();
  const { data, error } = await createAdminClient().rpc("add_diamond_trade", {
    p_kind: input.kind, p_qty: input.quantity, p_price: input.unitPrice, p_at: input.tradedAt, p_note: input.note, p_apply: apply,
  });
  if (error) throw translate(error);
  return Number(data ?? 0);
}

/** Só dá para mexer em lançamento do ciclo aberto: os ciclos fechados são histórico. */
async function openTrade(id: number): Promise<{ id: number; kind: TradeKind }> {
  const db = createAdminClient();
  const trade = await db.from("diamond_trades").select("id, kind, cycle_id").eq("id", id).maybeSingle();
  if (trade.error) throw translate(trade.error);
  const row = trade.data as { id: number; kind: TradeKind; cycle_id: number } | null;
  if (!row) throw new DiamondError("Esse lançamento não existe mais.", 404);
  const cycle = await db.from("diamond_cycles").select("ended_at").eq("id", row.cycle_id).maybeSingle();
  if (cycle.error) throw translate(cycle.error);
  if ((cycle.data as { ended_at: string | null } | null)?.ended_at) throw new DiamondError("Esse lançamento é de um ciclo fechado e não pode mais ser alterado.", 409);
  return { id: row.id, kind: row.kind };
}

export async function updateTrade(id: number, input: TradeInput): Promise<void> {
  await openTrade(id); // só lançamento do ciclo aberto; o banco mantém a solicitação de origem (se houver) em dia
  const { error } = await createAdminClient().rpc("update_diamond_trade", {
    p_id: id, p_kind: input.kind, p_qty: input.quantity, p_price: input.unitPrice, p_at: input.tradedAt, p_note: input.note,
  });
  if (error) throw translate(error);
}

export async function deleteTrade(id: number): Promise<void> {
  await openTrade(id);
  const { error } = await createAdminClient().rpc("delete_diamond_trade", { p_id: id });
  if (error) throw translate(error);
}

/**
 * Fecha o ciclo atual (fica guardado) e abre um novo zerado. Com `carry`, o estoque que sobrou vai para o novo ciclo
 * ao custo médio, para o lucro das próximas vendas não sair inflado.
 */
export async function resetCycle(carry: boolean): Promise<void> {
  const cycle = await ensureOpenCycle();
  let qty = 0;
  let price = 0;
  if (carry) {
    const { data, error } = await createAdminClient().from("diamond_trades").select("id, cycle_id, kind, quantity, unit_price, traded_at, note").eq("cycle_id", cycle.id);
    if (error) throw translate(error);
    const ledger = computeLedger(((data ?? []) as TradeRow[]).map(toTrade));
    const last = ledger[ledger.length - 1];
    qty = last?.stockAfter ?? 0;
    price = Math.round(last?.avgCostAfter ?? 0);
  }
  const { error } = await createAdminClient().rpc("reset_diamond_cycle", { p_carry_qty: qty, p_carry_price: price });
  if (error) throw translate(error);
}

/** Apaga um ciclo fechado e todos os lançamentos dele. O ciclo aberto não pode ser apagado (use "reiniciar"). */
export async function deleteClosedCycle(id: number): Promise<void> {
  const db = createAdminClient();
  const { data, error } = await db.from("diamond_cycles").select("ended_at").eq("id", id).maybeSingle();
  if (error) throw translate(error);
  const row = data as { ended_at: string | null } | null;
  if (!row) throw new DiamondError("Esse ciclo não existe mais.", 404);
  if (!row.ended_at) throw new DiamondError("O ciclo atual não pode ser apagado. Use “Reiniciar balanço”.", 409);
  const { error: delError } = await db.from("diamond_cycles").delete().eq("id", id);
  if (delError) throw translate(delError);
}

// ---------- solicitações (ordens) ----------

export type OrderInput = { kind: "buy" | "sell"; quantity: number; unitPrice: number; note: string | null };

/** Cria uma solicitação aberta no ciclo atual. Ela ainda não mexe no balanço: só vira lançamento quando for confirmada. */
export async function addOrder(input: OrderInput): Promise<void> {
  const cycle = await ensureOpenCycle();
  const { error } = await createAdminClient().from("diamond_orders").insert({
    cycle_id: cycle.id, kind: input.kind, quantity: input.quantity, unit_price: input.unitPrice, initial_price: input.unitPrice, note: input.note,
  });
  if (error) throw translate(error);
}

async function readOrder(id: number): Promise<Order> {
  const { data, error } = await createAdminClient().from("diamond_orders").select(ORDER_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw translate(error);
  if (!data) throw new DiamondError("Essa solicitação não existe mais.", 404);
  return toOrder(data as OrderRow);
}

/** Altera valor, quantidade total e observação de uma solicitação aberta. A quantidade não pode ficar abaixo do que já foi executado. */
export async function updateOrder(id: number, input: Omit<OrderInput, "kind">): Promise<void> {
  const order = await readOrder(id);
  if (order.status !== "open") throw new DiamondError("Essa solicitação já foi encerrada e não pode mais ser alterada.", 409);
  if (input.quantity < order.filled) throw new DiamondError(`A quantidade não pode ficar abaixo do que já foi executado (${order.filled} dd).`, 400);
  const done = input.quantity === order.filled; // reduziu até o que já tinha sido executado: a solicitação está completa
  const { error } = await createAdminClient().from("diamond_orders").update({
    quantity: input.quantity, unit_price: input.unitPrice, note: input.note,
    ...(done ? { status: "filled", closed_at: new Date().toISOString() } : {}),
  }).eq("id", id);
  if (error) throw translate(error);
}

/** Confirma (tudo ou parte de) uma solicitação: vira lançamento no balanço, com a quantidade e o preço realmente executados. */
export async function fillOrder(id: number, quantity: number, unitPrice: number, at: string | null): Promise<void> {
  const { error } = await createAdminClient().rpc("fill_diamond_order", { p_order_id: id, p_qty: quantity, p_price: unitPrice, p_at: at });
  if (error) throw translate(error);
}

/** Cancela o que ainda falta. O que já foi executado continua no balanço. */
export async function cancelOrder(id: number): Promise<void> {
  const order = await readOrder(id);
  if (order.status !== "open") throw new DiamondError("Essa solicitação já foi encerrada.", 409);
  const { error } = await createAdminClient().from("diamond_orders").update({ status: "cancelled", closed_at: new Date().toISOString() }).eq("id", id);
  if (error) throw translate(error);
}

/** Apaga uma solicitação encerrada (concluída ou cancelada). Os lançamentos que ela gerou ficam no balanço. */
export async function deleteOrder(id: number): Promise<void> {
  const order = await readOrder(id);
  if (order.status === "open") throw new DiamondError("Cancele a solicitação antes de apagar.", 409);
  const { error } = await createAdminClient().from("diamond_orders").delete().eq("id", id);
  if (error) throw translate(error);
}
