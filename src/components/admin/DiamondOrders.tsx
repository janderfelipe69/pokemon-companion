"use client";

import { useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Pencil, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { fmt, fmtShort, fmtSigned, orderLeft, parseAmount, summarizeOrders, toLocalInput, type Order } from "@/lib/diamonds";

type Notice = { kind: "ok" | "error"; text: string };

/** Chama a API e devolve o texto do erro, ou `null` se deu certo. */
export type OrderCall = (body: Record<string, unknown>) => Promise<string | null>;

const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg placeholder:text-muted/60";
const ghostButton = "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-fg disabled:opacity-40";
const tone = (n: number) => (n > 0 ? "text-teal" : n < 0 ? "text-red-300" : "text-fg");
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const KIND_WORD = { buy: "compra", sell: "venda" } as const;

type CardProps = { order: Order; stock: number; avgCost: number; busy: boolean; call: OrderCall; onNotice: (n: Notice) => void };

/** Uma solicitação aberta: mostra o que falta, e deixa confirmar (tudo ou parte), alterar o valor ou cancelar. */
function OrderCard({ order, stock, avgCost, busy, call, onNotice }: CardProps) {
  const left = orderLeft(order);
  const sell = order.kind === "sell";
  const [mode, setMode] = useState<null | "fill" | "edit">(null);
  const [error, setError] = useState("");
  const [fillQty, setFillQty] = useState("");
  const [fillPrice, setFillPrice] = useState("");
  const [fillAt, setFillAt] = useState("");
  const [editQty, setEditQty] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editNote, setEditNote] = useState("");

  const fq = parseAmount(fillQty);
  const fp = parseAmount(fillPrice);
  const estimate = sell && fq && fp !== null && stock > 0 ? Math.min(fq, stock) * (fp - avgCost) + Math.max(0, fq - stock) * fp : null;
  const diff = order.unitPrice - order.initialPrice;

  function openFill() {
    setMode("fill");
    setError("");
    setFillQty(String(left));
    setFillPrice(String(order.unitPrice));
    setFillAt(toLocalInput(new Date()));
  }

  function openEdit() {
    setMode("edit");
    setError("");
    setEditQty(String(order.quantity));
    setEditPrice(String(order.unitPrice));
    setEditNote(order.note ?? "");
  }

  async function confirmFill() {
    if (!fq || fq > left) return setError(`Digite quantos dd foram ${sell ? "vendidos" : "comprados"} (de 1 a ${fmt(left)}).`);
    if (fp === null) return setError("Digite o valor de cada dd, como 380000 ou 380k.");
    const err = await call({ action: "order-fill", id: order.id, quantity: fq, unitPrice: fp, tradedAt: fillAt ? new Date(fillAt).toISOString() : null });
    if (err) return setError(err);
    const rest = left - fq;
    setMode(null);
    onNotice({ kind: "ok", text: `${sell ? "Venda" : "Compra"} confirmada: ${fmt(fq)} dd a ${fmt(fp)}. ${rest > 0 ? `Ainda faltam ${fmt(rest)} dd nessa solicitação.` : "Solicitação concluída."}` });
  }

  async function saveEdit() {
    const q = parseAmount(editQty);
    const p = parseAmount(editPrice);
    if (!q) return setError("Digite a quantidade total de dd da solicitação.");
    if (q < order.filled) return setError(`A quantidade não pode ficar abaixo do que já foi executado (${fmt(order.filled)} dd).`);
    if (p === null) return setError("Digite o valor de cada dd, como 380000 ou 380k.");
    const err = await call({ action: "order-update", id: order.id, kind: order.kind, quantity: q, unitPrice: p, note: editNote });
    if (err) return setError(err);
    setMode(null);
    onNotice({ kind: "ok", text: `Solicitação atualizada: ${fmt(q - order.filled)} dd a ${fmt(p)}.` });
  }

  async function cancel() {
    if (!window.confirm(`Cancelar a solicitação de ${KIND_WORD[order.kind]} de ${fmt(left)} dd a ${fmt(order.unitPrice)}?${order.filled > 0 ? ` O que já foi executado (${fmt(order.filled)} dd) continua no balanço.` : ""}`)) return;
    const err = await call({ action: "order-cancel", id: order.id });
    onNotice(err ? { kind: "error", text: err } : { kind: "ok", text: "Solicitação cancelada." });
  }

  return (
    <li className={`rounded-xl border bg-panel p-4 ${sell ? "border-teal/40" : "border-gold/40"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sell ? "border-teal/40 bg-teal/10 text-teal" : "border-gold/40 bg-gold/10 text-gold"}`}>{sell ? "Venda" : "Compra"}</span>
        <span className="text-xs text-muted">aberta em {when(order.createdAt)}</span>
        {diff !== 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-muted" title={`O valor era ${fmt(order.initialPrice)} quando a solicitação foi criada`}>
            {diff > 0 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />} era {fmt(order.initialPrice)}
          </span>
        )}
      </div>

      <p className="mt-3 text-2xl font-semibold tabular-nums">
        {fmt(left)} dd <span className="text-base font-normal text-muted">a</span> {fmt(order.unitPrice)}
      </p>
      <p className="mt-1 text-sm text-muted">
        Valor restante: <b className="text-fg">{fmt(left * order.unitPrice)}</b> ({fmtShort(left * order.unitPrice)})
        {order.filled > 0 && <> · já {sell ? "vendeu" : "comprou"} {fmt(order.filled)} de {fmt(order.quantity)}</>}
      </p>
      {sell && stock > 0 && <p className={`mt-1 text-xs ${tone(left * (order.unitPrice - avgCost))}`}>Lucro estimado se vender tudo: {fmtSigned(Math.min(left, stock) * (order.unitPrice - avgCost) + Math.max(0, left - stock) * order.unitPrice)} (custo médio {fmt(avgCost)})</p>}
      {order.note && <p className="mt-2 truncate text-xs text-muted" title={order.note}>{order.note}</p>}

      {mode === null && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={openFill} className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40 ${sell ? "bg-teal" : "bg-gold"}`}>
            Confirmar {KIND_WORD[order.kind]}
          </button>
          <button type="button" disabled={busy} onClick={openEdit} className={ghostButton}><Pencil className="size-3.5" aria-hidden /> Alterar valor</button>
          <button type="button" disabled={busy} onClick={() => void cancel()} className={`${ghostButton} hover:!text-red-300`}><X className="size-3.5" aria-hidden /> Cancelar</button>
        </div>
      )}

      {mode === "fill" && (
        <div className="mt-4 space-y-3 rounded-lg border border-line bg-raised p-3">
          <p className="text-xs text-muted">Quantos dd {sell ? "foram vendidos" : "foram comprados"} agora, e por quanto cada um? Se foi só uma parte, o resto continua na solicitação.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Quantos dd</span><input inputMode="numeric" value={fillQty} onChange={(e) => setFillQty(e.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Valor de cada dd</span><input value={fillPrice} onChange={(e) => setFillPrice(e.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Data e hora</span><input type="datetime-local" value={fillAt} onChange={(e) => setFillAt(e.target.value)} className={inputClass} /></label>
          </div>
          {fq && fp !== null && (
            <p className="text-sm text-muted">
              {fmt(fq)} × {fmt(fp)} = <b className="text-fg">{fmt(fq * fp)}</b>
              {estimate !== null && <span className={`ml-2 ${tone(estimate)}`}>Lucro estimado: {fmtSigned(estimate)}</span>}
              {sell && fq > stock && <span className="ml-2 text-gold">Você só tem {fmt(stock)} dd em estoque.</span>}
            </p>
          )}
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void confirmFill()} className={`rounded-lg px-4 py-1.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40 ${sell ? "bg-teal" : "bg-gold"}`}>{busy ? "Confirmando..." : `Confirmar ${KIND_WORD[order.kind]}`}</button>
            <button type="button" onClick={() => setFillQty(String(left))} className={ghostButton}>Tudo ({fmt(left)} dd)</button>
            <button type="button" onClick={() => setMode(null)} className={ghostButton}>Voltar</button>
          </div>
        </div>
      )}

      {mode === "edit" && (
        <div className="mt-4 space-y-3 rounded-lg border border-line bg-raised p-3">
          <p className="text-xs text-muted">Altere o valor (e, se precisar, a quantidade total). Isso não mexe no balanço: só atualiza a solicitação.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block"><span className="mb-1 block text-xs text-muted">Novo valor de cada dd</span><input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Quantidade total</span><input inputMode="numeric" value={editQty} onChange={(e) => setEditQty(e.target.value)} className={inputClass} /></label>
            <label className="block"><span className="mb-1 block text-xs text-muted">Observação</span><input value={editNote} maxLength={120} onChange={(e) => setEditNote(e.target.value)} className={inputClass} /></label>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => void saveEdit()} className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">{busy ? "Salvando..." : "Salvar"}</button>
            <button type="button" onClick={() => setMode(null)} className={ghostButton}>Voltar</button>
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Solicitações no market: você registra o pedido de compra ou de venda com o valor, e depois confirma quando executar
 * (tudo ou só uma parte). A confirmação é que vira lançamento no balanço, então o balanço só reflete o que realmente aconteceu.
 */
export function DiamondOrders({ orders, stock, avgCost, busy, call }: { orders: Order[]; stock: number; avgCost: number; busy: boolean; call: OrderCall }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [kind, setKind] = useState<"buy" | "sell">("sell");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  const open = orders.filter((o) => o.status === "open");
  const closed = orders.filter((o) => o.status !== "open").slice(0, 10);
  const totals = summarizeOrders(open, stock);
  const q = parseAmount(qty);
  const p = parseAmount(price);

  async function create() {
    if (!q) return setNotice({ kind: "error", text: "Digite a quantidade de dd da solicitação (número inteiro, ex.: 50)." });
    if (p === null) return setNotice({ kind: "error", text: "Digite o valor de cada dd, como 380000, 380.000 ou 380k." });
    const err = await call({ action: "order-add", kind, quantity: q, unitPrice: p, note });
    if (err) return setNotice({ kind: "error", text: err });
    setNotice({ kind: "ok", text: `Solicitação de ${KIND_WORD[kind]} registrada: ${fmt(q)} dd a ${fmt(p)}.` });
    setQty("");
    setPrice("");
    setNote("");
  }

  async function remove(o: Order) {
    if (!window.confirm("Apagar essa solicitação do histórico? Os lançamentos que ela gerou continuam no balanço.")) return;
    const err = await call({ action: "order-delete", id: o.id });
    setNotice(err ? { kind: "error", text: err } : { kind: "ok", text: "Solicitação apagada." });
  }

  return (
    <section aria-labelledby="ordens-title" className="space-y-4">
      <div>
        <h3 id="ordens-title" className="flex items-center gap-2 text-base font-semibold"><ClipboardList className="size-5 text-muted" aria-hidden /> Solicitações no market <span className="text-sm font-normal text-muted">{open.length} aberta{open.length === 1 ? "" : "s"}</span></h3>
        <p className="mt-1 text-sm text-muted">Registre o pedido com o valor assim que colocar no market. Quando executar, clique em <b className="font-medium text-fg">Confirmar</b> (tudo ou só uma parte): aí vira lançamento no balanço. Se o valor mudar, use <b className="font-medium text-fg">Alterar valor</b>.</p>
      </div>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={`flex items-start gap-1.5 text-sm ${notice.kind === "error" ? "text-red-300" : "text-teal"}`}>
          {notice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {notice.text}
        </p>
      )}

      {(open.length > 0 || stock > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-line bg-raised px-4 py-3 text-sm">
          <span>À venda: <b className="text-teal">{fmt(totals.sellQty)} dd</b> <span className="text-muted">({fmtShort(totals.sellValue)})</span></span>
          <span>Comprando: <b className="text-gold">{fmt(totals.buyQty)} dd</b> <span className="text-muted">({fmtShort(totals.buyValue)})</span></span>
          <span className="text-muted">Estoque {fmt(stock)} dd · <b className={totals.free < 0 ? "text-gold" : "text-fg"}>{fmt(totals.free)} livres</b> para novas vendas</span>
          {totals.free < 0 && <span className="w-full text-xs text-gold">As solicitações de venda somam mais que o seu estoque. Confira se falta lançar alguma compra.</span>}
        </div>
      )}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">Nova solicitação</h4>
          <div className="inline-flex gap-1 rounded-xl border border-line bg-raised p-1" role="radiogroup" aria-label="Tipo da solicitação">
            {([["buy", "Compra"], ["sell", "Venda"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${kind === id ? (id === "buy" ? "bg-gold/15 text-gold" : "bg-teal/15 text-teal") : "text-muted hover:text-fg"}`}>{label}</button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block"><span className="mb-1 block text-xs text-muted">Quantos dd</span><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="50" className={inputClass} /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted">Valor de cada dd</span><input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="410000 ou 410k" className={inputClass} /></label>
          <label className="block"><span className="mb-1 block text-xs text-muted">Observação (opcional)</span><input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: market, sorteio..." className={inputClass} /></label>
        </div>
        {q && p !== null && <p className="text-sm text-muted">{fmt(q)} × {fmt(p)} = <b className="text-fg">{fmt(q * p)}</b> ({fmtShort(q * p)})</p>}
        <button type="button" disabled={busy} onClick={() => void create()} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
          {busy ? "Salvando..." : kind === "buy" ? "Registrar solicitação de compra" : "Registrar solicitação de venda"}
        </button>
      </Card>

      {open.length === 0 ? (
        <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">Nenhuma solicitação aberta. Registre acima o pedido que você colocou no market.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {open.map((o) => <OrderCard key={o.id} order={o} stock={stock} avgCost={avgCost} busy={busy} call={call} onNotice={setNotice} />)}
        </ul>
      )}

      {closed.length > 0 && (
        <details className="rounded-xl border border-line bg-raised/50 p-4">
          <summary className="cursor-pointer text-sm font-medium">Solicitações encerradas <span className="text-muted">({closed.length} mais recentes)</span></summary>
          <ul className="mt-3 space-y-1.5 text-sm">
            {closed.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-panel px-3 py-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-xs ${o.status === "filled" ? "border-teal/40 bg-teal/10 text-teal" : "border-line text-muted"}`}>{o.status === "filled" ? "Concluída" : "Cancelada"}</span>
                <span>{o.kind === "sell" ? "Venda" : "Compra"}: {fmt(o.filled)} de {fmt(o.quantity)} dd a {fmt(o.unitPrice)}</span>
                <span className="text-xs text-muted">{when(o.closedAt ?? o.createdAt)}</span>
                <button type="button" disabled={busy} onClick={() => void remove(o)} aria-label="Apagar do histórico" className="ml-auto rounded p-1 text-muted hover:text-red-300"><Trash2 className="size-4" aria-hidden /></button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
