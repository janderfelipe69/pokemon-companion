"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import {
  computeLedger, filterTrades, fmt, fmtShort, fmtSigned, parseAmount, periodRange, summarize,
  type KindFilter, type Period, type Trade, type TradeCalc, type TradeKind,
} from "@/lib/diamonds";

type Cycle = { id: number; startedAt: string; endedAt: string | null };
type Notice = { kind: "ok" | "error"; text: string };

const RESET_WORD = "REINICIAR";
const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg placeholder:text-muted/60";
const ghostButton = "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40";
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs font-medium transition-colors ${on ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`;

const PERIODS: { id: Period; label: string }[] = [
  { id: "all", label: "Ciclo todo" },
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "custom", label: "Escolher datas" },
];
const KINDS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "buy", label: "Só compras" },
  { id: "sell", label: "Só vendas" },
];

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** ISO → valor do campo datetime-local (no relógio do navegador). */
const toLocalInput = (iso: string | Date) => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const day = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const tone = (n: number) => (n > 0 ? "text-teal" : n < 0 ? "text-red-300" : "text-fg");

function Stat({ label, value, sub, valueClass = "" }: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-line bg-raised p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

const KIND_LABEL: Record<TradeKind, string> = { buy: "Compra", sell: "Venda", carry: "Estoque anterior" };
const KIND_STYLE: Record<TradeKind, string> = { buy: "border-gold/40 bg-gold/10 text-gold", sell: "border-teal/40 bg-teal/10 text-teal", carry: "border-line bg-raised text-muted" };

/** Controle de diamantes: o que foi gasto comprando, o que entrou vendendo, o saldo, o lucro e o estoque. Só no painel do admin. */
export function DiamondsManager() {
  const [data, setData] = useState<{ cycles: Cycle[]; trades: Trade[] } | null>(null);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const [cycleId, setCycleId] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [kind, setKind] = useState<"buy" | "sell">("buy");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [at, setAt] = useState("");
  const [note, setNote] = useState("");

  const [resetOpen, setResetOpen] = useState(false);
  const [resetWord, setResetWord] = useState("");
  const [carry, setCarry] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/diamonds", { cache: "no-store" });
      const body = await readJson(response);
      if (!response.ok) throw new Error(String(body.error || "Não foi possível carregar o controle de diamantes."));
      const next = { cycles: body.cycles as Cycle[], trades: body.trades as Trade[] };
      setData(next);
      setLoadError("");
      // Primeira carga (ou o ciclo selecionado sumiu): vai para o ciclo aberto.
      setCycleId((current) => (current !== null && next.cycles.some((c) => c.id === current) ? current : (next.cycles.find((c) => !c.endedAt)?.id ?? null)));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar.");
    }
  }, []);

  useEffect(() => {
    void load();
    setAt(toLocalInput(new Date()));
  }, [load]);

  const cycle = data?.cycles.find((c) => c.id === cycleId) ?? null;
  const isOpen = !!cycle && !cycle.endedAt;

  // Contas do ciclo escolhido. O estoque e o custo médio sempre olham o ciclo inteiro; o filtro só recorta o que aparece nos totais e na lista.
  const ledger = useMemo<TradeCalc[]>(() => computeLedger((data?.trades ?? []).filter((t) => t.cycleId === cycleId)), [data, cycleId]);
  const range = useMemo(() => periodRange(period, { from, to }), [period, from, to]);
  const visible = useMemo(() => filterTrades(ledger, range, kindFilter), [ledger, range, kindFilter]);
  const summary = useMemo(() => summarize(visible, ledger), [visible, ledger]);
  const rows = useMemo(() => [...visible].reverse(), [visible]);

  const quantity = parseAmount(qty);
  const unit = parseAmount(price);
  const total = quantity && unit !== null ? quantity * unit : null;
  // Para a venda: quanto de lucro dá agora (estimativa com o estoque e o custo médio atuais, sem contar o lançamento que está sendo editado).
  const stockNow = useMemo(() => summarize([], computeLedger((data?.trades ?? []).filter((t) => t.cycleId === cycleId && t.id !== editingId))), [data, cycleId, editingId]);
  const estimate = kind === "sell" && quantity && unit !== null && stockNow.stock > 0 ? Math.min(quantity, stockNow.stock) * (unit - stockNow.avgCost) + Math.max(0, quantity - stockNow.stock) * unit : null;

  function resetForm() {
    setEditingId(null);
    setQty("");
    setPrice("");
    setNote("");
    setAt(toLocalInput(new Date()));
  }

  function startEdit(t: TradeCalc) {
    setEditingId(t.id);
    setKind(t.kind === "sell" ? "sell" : "buy");
    setQty(String(t.quantity));
    setPrice(String(t.unitPrice));
    setAt(toLocalInput(t.tradedAt));
    setNote(t.note ?? "");
    setNotice(null);
    document.getElementById("diamantes-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function post(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/diamonds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await readJson(response);
      if (!response.ok) throw new Error(String(result.error || "Não foi possível concluir."));
      await load();
      return true;
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao enviar." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!quantity) return setNotice({ kind: "error", text: "Digite a quantidade de diamantes (número inteiro, ex.: 50)." });
    if (unit === null) return setNotice({ kind: "error", text: "Digite o preço de cada diamante, como 380000, 380.000 ou 380k." });
    const body = { kind, quantity, unitPrice: unit, tradedAt: at ? new Date(at).toISOString() : null, note };
    const ok = await post(editingId ? { action: "update", id: editingId, ...body } : { action: "add", ...body });
    if (ok) {
      setNotice({ kind: "ok", text: editingId ? "Lançamento atualizado." : `${kind === "buy" ? "Compra" : "Venda"} registrada: ${fmt(quantity)} dd a ${fmt(unit)}.` });
      resetForm();
    }
  }

  async function remove(t: TradeCalc) {
    if (!window.confirm(`Apagar ${KIND_LABEL[t.kind].toLowerCase()} de ${fmt(t.quantity)} dd a ${fmt(t.unitPrice)}?`)) return;
    if (await post({ action: "delete", id: t.id })) {
      if (editingId === t.id) resetForm();
      setNotice({ kind: "ok", text: "Lançamento apagado." });
    }
  }

  async function reset() {
    if (await post({ action: "reset", carry, confirm: resetWord })) {
      setResetOpen(false);
      setResetWord("");
      resetForm();
      setCycleId(null); // a recarga leva ao ciclo novo
      await load();
      setNotice({ kind: "ok", text: "Balanço reiniciado. O ciclo anterior ficou guardado para consulta." });
    }
  }

  async function removeCycle() {
    if (!cycle || !window.confirm("Apagar este ciclo e todos os lançamentos dele? Isso não dá para desfazer.")) return;
    if (await post({ action: "delete-cycle", id: cycle.id })) {
      setCycleId(null);
      setNotice({ kind: "ok", text: "Ciclo apagado." });
    }
  }

  const openCycle = data?.cycles.find((c) => !c.endedAt) ?? null;
  const oneDay = period === "today";

  return (
    <section aria-labelledby="diamantes-title" className="space-y-6">
      <div>
        <h2 id="diamantes-title" className="text-xl font-semibold">Diamantes</h2>
        <p className="mt-1 text-sm text-muted">Registre o que comprou e o que vendeu. O balanço calcula o gasto, o que entrou, o saldo, o lucro e o estoque. Só você vê esta aba.</p>
      </div>

      {loadError && <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {loadError}</p>}
      {!data && !loadError && <p className="text-sm text-muted">Carregando...</p>}

      {data && cycle && (
        <>
          {/* Ciclo */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Balanço:</span>
              <select value={cycleId ?? ""} onChange={(e) => { setCycleId(Number(e.target.value)); resetForm(); }} className="rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg">
                {data.cycles.map((c) => (
                  <option key={c.id} value={c.id}>{c.endedAt ? `Anterior: ${day(c.startedAt)} a ${day(c.endedAt)}` : `Atual (desde ${day(c.startedAt)})`}</option>
                ))}
              </select>
            </label>
            {isOpen ? (
              <button type="button" onClick={() => { setResetOpen(true); setResetWord(""); setNotice(null); }} className={`${ghostButton} hover:!border-red-300/60 hover:!text-red-300`}>
                <RotateCcw className="size-4" aria-hidden /> Reiniciar balanço
              </button>
            ) : (
              <>
                <span className="rounded-full border border-line bg-raised px-3 py-1 text-xs text-muted">Ciclo fechado: só consulta</span>
                <button type="button" disabled={busy} onClick={() => void removeCycle()} className={`${ghostButton} hover:!text-red-300`}><Trash2 className="size-4" aria-hidden /> Apagar este ciclo</button>
                {openCycle && <button type="button" onClick={() => { setCycleId(openCycle.id); }} className={ghostButton}>Voltar ao atual</button>}
              </>
            )}
          </div>

          {notice && (
            <p role={notice.kind === "error" ? "alert" : "status"} className={`flex items-start gap-1.5 text-sm ${notice.kind === "error" ? "text-red-300" : "text-teal"}`}>
              {notice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {notice.text}
            </p>
          )}

          {/* Filtros */}
          <Card className="space-y-3">
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Período">
              <span className="mr-1 text-sm text-muted">Período:</span>
              {PERIODS.map((p) => <button key={p.id} type="button" aria-pressed={period === p.id} onClick={() => setPeriod(p.id)} className={chip(period === p.id)}>{p.label}</button>)}
              {period === "custom" && (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" className="rounded-lg border border-line bg-raised px-2 py-1 text-sm text-fg" />
                  <span className="text-muted">até</span>
                  <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Até" className="rounded-lg border border-line bg-raised px-2 py-1 text-sm text-fg" />
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipo">
              <span className="mr-1 text-sm text-muted">Mostrar:</span>
              {KINDS.map((k) => <button key={k.id} type="button" aria-pressed={kindFilter === k.id} onClick={() => setKindFilter(k.id)} className={chip(kindFilter === k.id)}>{k.label}</button>)}
            </div>
          </Card>

          {/* Totais */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Stat label="Gasto (compras)" value={fmt(summary.spent)} sub={summary.bought > 0 ? `${fmt(summary.bought)} dd · média ${fmt(summary.avgBuy ?? 0)}` : "nenhuma compra"} />
            <Stat label="Recebido (vendas)" value={fmt(summary.received)} sub={summary.sold > 0 ? `${fmt(summary.sold)} dd · média ${fmt(summary.avgSell ?? 0)}` : "nenhuma venda"} />
            <Stat label="Saldo (recebido − gasto)" value={fmtSigned(summary.balance)} valueClass={tone(summary.balance)} sub={`${fmtShort(summary.balance)} no total`} />
            <Stat label="Lucro das vendas" value={fmtSigned(summary.realized)} valueClass={tone(summary.realized)} sub={summary.margin !== null ? `${fmtSigned(summary.margin)} por dd (venda média − compra média)` : "só conta o que foi vendido"} />
            <Stat label="Em estoque" value={`${fmt(summary.stock)} dd`} sub={summary.stock > 0 ? `custo médio ${fmt(summary.avgCost)} · vale ${fmtShort(summary.stockValue)} ao custo` : "sem diamantes parados"} />
          </div>
          <p className="text-xs leading-relaxed text-muted">
            <b className="font-medium text-fg">Saldo</b> = tudo que entrou vendendo menos tudo que gastou comprando, inclusive os diamantes que ainda estão parados no estoque (por isso pode ficar negativo enquanto você não vende).{" "}
            <b className="font-medium text-fg">Lucro das vendas</b> = só o que já foi vendido, contra o preço médio de compra na hora da venda. O estoque sempre conta o ciclo inteiro, mesmo com filtro.
            {oneDay && " O filtro “Hoje” usa o dia de Brasília."}
          </p>
          {summary.oversold > 0 && (
            <p role="alert" className="flex items-start gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-gold">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              Você vendeu {fmt(summary.oversold)} dd a mais do que tinha comprado neste ciclo. Falta lançar alguma compra (ou a data de uma venda está antes da compra). Essas vendas entram no lucro sem custo.
            </p>
          )}

          {/* Registrar */}
          {isOpen && (
            <Card className="space-y-4" >
              <div id="diamantes-form" className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{editingId ? "Editar lançamento" : "Registrar"}</h3>
                <div className="inline-flex gap-1 rounded-xl border border-line bg-raised p-1" role="radiogroup" aria-label="Tipo do lançamento">
                  {([["buy", "Compra"], ["sell", "Venda"]] as const).map(([id, label]) => (
                    <button key={id} type="button" role="radio" aria-checked={kind === id} onClick={() => setKind(id)} className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${kind === id ? (id === "buy" ? "bg-gold/15 text-gold" : "bg-teal/15 text-teal") : "text-muted hover:text-fg"}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block"><span className="mb-1 block text-xs text-muted">Quantos diamantes (dd)</span><input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="50" className={inputClass} /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Preço de cada dd</span><input inputMode="text" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="380000 ou 380k" className={inputClass} /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Data e hora</span><input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={inputClass} /></label>
                <label className="block"><span className="mb-1 block text-xs text-muted">Observação (opcional)</span><input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: market, sorteio..." className={inputClass} /></label>
              </div>
              {(qty || price) && (
                <p className="text-sm text-muted">
                  {quantity && unit !== null ? <>{fmt(quantity)} × {fmt(unit)} = <b className="text-fg">{fmt(total ?? 0)}</b> ({fmtShort(total ?? 0)})</> : "Digite a quantidade e o preço para ver o total."}
                  {kind === "sell" && quantity && unit !== null && (
                    stockNow.stock === 0
                      ? <span className="ml-2 text-gold">Você não tem estoque lançado: essa venda entra sem custo.</span>
                      : <>
                          {quantity > stockNow.stock && <span className="ml-2 text-gold">Você só tem {fmt(stockNow.stock)} dd em estoque.</span>}
                          {estimate !== null && <span className={`ml-2 ${tone(estimate)}`}>Lucro estimado: {fmtSigned(estimate)} (custo médio {fmt(stockNow.avgCost)}).</span>}
                        </>
                  )}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void submit()} disabled={busy} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                  {busy ? "Salvando..." : editingId ? "Salvar alterações" : kind === "buy" ? "Registrar compra" : "Registrar venda"}
                </button>
                {editingId && <button type="button" onClick={resetForm} className={ghostButton}>Cancelar edição</button>}
              </div>
            </Card>
          )}

          {/* Lista */}
          <div>
            <h3 className="mb-2 text-base font-semibold">Lançamentos <span className="text-sm font-normal text-muted">{rows.length}</span></h3>
            {rows.length === 0 ? (
              <p className="rounded-lg border border-line bg-raised p-4 text-sm text-muted">{ledger.length === 0 ? "Nenhum lançamento neste balanço ainda." : "Nenhum lançamento nesse filtro."}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[44rem] text-sm">
                  <thead className="bg-raised text-left text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Data</th><th className="px-3 py-2 font-medium">Tipo</th>
                      <th className="px-3 py-2 text-right font-medium">Qtd</th><th className="px-3 py-2 text-right font-medium">Preço</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th><th className="px-3 py-2 text-right font-medium">Lucro</th>
                      <th className="px-3 py-2 font-medium">Obs</th>{isOpen && <th className="px-3 py-2"><span className="sr-only">Ações</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id} className={`border-t border-line ${editingId === t.id ? "bg-gold/5" : ""}`}>
                        <td className="whitespace-nowrap px-3 py-2 text-muted">{when(t.tradedAt)}</td>
                        <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs ${KIND_STYLE[t.kind]}`}>{KIND_LABEL[t.kind]}</span></td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(t.quantity)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(t.unitPrice)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(t.total)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${t.profit !== null ? tone(t.profit) : "text-muted"}`} title={t.oversold > 0 ? `${fmt(t.oversold)} dd sem estoque` : undefined}>
                          {t.profit !== null ? `${fmtSigned(t.profit)}${t.oversold > 0 ? " ⚠" : ""}` : "—"}
                        </td>
                        <td className="max-w-48 truncate px-3 py-2 text-muted" title={t.note ?? undefined}>{t.note ?? ""}</td>
                        {isOpen && (
                          <td className="whitespace-nowrap px-3 py-2 text-right">
                            <button type="button" onClick={() => startEdit(t)} aria-label="Editar" className="rounded p-1.5 text-muted hover:text-fg"><Pencil className="size-4" aria-hidden /></button>
                            <button type="button" disabled={busy} onClick={() => void remove(t)} aria-label="Apagar" className="rounded p-1.5 text-muted hover:text-red-300"><Trash2 className="size-4" aria-hidden /></button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Confirmação do reinício */}
          <Dialog open={resetOpen} onClose={() => setResetOpen(false)} title="Reiniciar balanço">
            <div className="space-y-4 p-5 pr-14">
              <h3 className="text-lg font-semibold">Reiniciar o balanço?</h3>
              <p className="text-sm text-muted">O balanço atual vai para “Anteriores” (fica guardado para consulta) e começa um novo, zerado. Os totais de hoje serão assim:</p>
              <ul className="grid gap-1.5 rounded-lg border border-line bg-raised p-3 text-sm sm:grid-cols-2">
                <li>Gasto: <b>{fmt(summarize(ledger, ledger).spent)}</b></li>
                <li>Recebido: <b>{fmt(summarize(ledger, ledger).received)}</b></li>
                <li>Saldo: <b className={tone(summarize(ledger, ledger).balance)}>{fmtSigned(summarize(ledger, ledger).balance)}</b></li>
                <li>Lucro das vendas: <b className={tone(summarize(ledger, ledger).realized)}>{fmtSigned(summarize(ledger, ledger).realized)}</b></li>
              </ul>
              {summarize(ledger, ledger).stock > 0 && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} className="mt-1" />
                  <span>Levar para o novo balanço os <b>{fmt(summarize(ledger, ledger).stock)} dd</b> que sobraram no estoque, ao custo médio de {fmt(summarize(ledger, ledger).avgCost)}. Eles não contam como gasto novo; só evitam que o lucro das próximas vendas saia errado.</span>
                </label>
              )}
              <label className="block text-sm">
                <span className="mb-1 block text-muted">Para confirmar, digite <b className="text-fg">{RESET_WORD}</b></span>
                <input value={resetWord} onChange={(e) => setResetWord(e.target.value)} autoComplete="off" className={inputClass} />
              </label>
              {notice?.kind === "error" && <p role="alert" className="text-sm text-red-300">{notice.text}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy || resetWord.trim().toUpperCase() !== RESET_WORD} onClick={() => void reset()} className="rounded-lg bg-red-400 px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                  {busy ? "Reiniciando..." : "Sim, reiniciar"}
                </button>
                <button type="button" onClick={() => setResetOpen(false)} className={ghostButton}>Cancelar</button>
              </div>
            </div>
          </Dialog>
        </>
      )}
    </section>
  );
}
