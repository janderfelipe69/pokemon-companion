import "server-only";
import { computeLedger, type Trade, type TradeKind } from "@/lib/diamonds";
import { isSetupMissing } from "@/lib/guild/boostData";
import { createAdminClient } from "@/lib/supabase/admin";

export const DIAMOND_SETUP_HINT = "O controle de diamantes ainda não está pronto no banco. Rode o arquivo supabase/migrations/0017_diamond_ledger.sql no SQL Editor do Supabase e tente de novo.";

/** Erro "esperado": a mensagem já pode ir direto para a tela. */
export class DiamondError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

type DbError = { code?: string; message?: string };
const translate = (e: DbError): DiamondError => {
  if (isSetupMissing(e) || /diamond_/i.test(e.message ?? "")) return new DiamondError(DIAMOND_SETUP_HINT, 500);
  console.error("[diamonds]", e.code, e.message);
  return new DiamondError("Não foi possível concluir. Tente de novo.", 500);
};

export type Cycle = { id: number; startedAt: string; endedAt: string | null };

type TradeRow = { id: number; cycle_id: number; kind: TradeKind; quantity: number; unit_price: number; traded_at: string; note: string | null };
const toTrade = (r: TradeRow): Trade => ({ id: r.id, cycleId: r.cycle_id, kind: r.kind, quantity: r.quantity, unitPrice: Number(r.unit_price), tradedAt: r.traded_at, note: r.note });

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
export async function listAll(): Promise<{ cycles: Cycle[]; trades: Trade[] }> {
  await ensureOpenCycle();
  const db = createAdminClient();
  const [cycles, trades] = await Promise.all([
    db.from("diamond_cycles").select("id, started_at, ended_at").order("id", { ascending: false }),
    db.from("diamond_trades").select("id, cycle_id, kind, quantity, unit_price, traded_at, note").order("traded_at", { ascending: true }).order("id", { ascending: true }).limit(20000),
  ]);
  for (const res of [cycles, trades]) if (res.error) throw translate(res.error);
  return {
    cycles: ((cycles.data ?? []) as { id: number; started_at: string; ended_at: string | null }[]).map((c) => ({ id: c.id, startedAt: c.started_at, endedAt: c.ended_at })),
    trades: ((trades.data ?? []) as TradeRow[]).map(toTrade),
  };
}

export type TradeInput = { kind: "buy" | "sell"; quantity: number; unitPrice: number; tradedAt: string | null; note: string | null };

export async function addTrade(input: TradeInput): Promise<void> {
  const cycle = await ensureOpenCycle();
  const { error } = await createAdminClient().from("diamond_trades").insert({
    cycle_id: cycle.id, kind: input.kind, quantity: input.quantity, unit_price: input.unitPrice, traded_at: input.tradedAt ?? new Date().toISOString(), note: input.note,
  });
  if (error) throw translate(error);
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
  const current = await openTrade(id);
  // O estoque que veio do ciclo anterior continua sendo estoque: dá para ajustar quantidade e preço, mas não virar compra ou venda.
  const { error } = await createAdminClient().from("diamond_trades").update({
    ...(current.kind === "carry" ? {} : { kind: input.kind }), quantity: input.quantity, unit_price: input.unitPrice, traded_at: input.tradedAt ?? new Date().toISOString(), note: input.note,
  }).eq("id", id);
  if (error) throw translate(error);
}

export async function deleteTrade(id: number): Promise<void> {
  await openTrade(id);
  const { error } = await createAdminClient().from("diamond_trades").delete().eq("id", id);
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
