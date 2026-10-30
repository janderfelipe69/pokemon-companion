// Contas do controle de diamantes. Puro (sem banco, sem tela): roda no servidor e no navegador, e dá para testar sozinho.

export type TradeKind = "buy" | "sell" | "carry";

export type Trade = {
  id: number;
  cycleId: number;
  /** buy = compra, sell = venda, carry = estoque que veio do ciclo anterior (não conta como gasto). */
  kind: TradeKind;
  /** Quantos diamantes (dd). */
  quantity: number;
  /** Preço de cada dd. */
  unitPrice: number;
  tradedAt: string;
  note: string | null;
};

export type TradeCalc = Trade & {
  /** quantidade × preço. */
  total: number;
  /** Só nas vendas: quanto custou o que foi vendido (custo médio do estoque na hora). */
  costBasis: number | null;
  /** Só nas vendas: lucro da venda = o que recebeu − custo médio do que vendeu. */
  profit: number | null;
  stockAfter: number;
  avgCostAfter: number;
  /** Quantos dd da venda passaram do estoque que existia (venda maior que o que foi comprado). */
  oversold: number;
};

const byTime = (a: Trade, b: Trade) => Date.parse(a.tradedAt) - Date.parse(b.tradedAt) || a.id - b.id;

/**
 * Passa os lançamentos de um ciclo em ordem de data, mantendo o estoque e o custo médio:
 * a compra puxa o custo médio para o preço pago; a venda lucra a diferença entre o preço de venda e o custo médio.
 * Venda maior que o estoque não derruba o estoque abaixo de zero: o excedente vira `oversold` e entra sem custo.
 */
export function computeLedger(trades: Trade[]): TradeCalc[] {
  let stock = 0;
  let avg = 0;
  return [...trades].sort(byTime).map((t) => {
    const total = t.quantity * t.unitPrice;
    if (t.kind === "sell") {
      const covered = Math.min(t.quantity, stock);
      const costBasis = covered * avg;
      stock -= covered;
      if (stock === 0) avg = 0;
      return { ...t, total, costBasis, profit: total - costBasis, stockAfter: stock, avgCostAfter: avg, oversold: t.quantity - covered };
    }
    avg = (stock * avg + total) / (stock + t.quantity);
    stock += t.quantity;
    return { ...t, total, costBasis: null, profit: null, stockAfter: stock, avgCostAfter: avg, oversold: 0 };
  });
}

export type Summary = {
  /** Soma das compras. */
  spent: number;
  /** Soma das vendas. */
  received: number;
  /** O que entrou menos o que saiu (recebido − gasto). */
  balance: number;
  bought: number;
  sold: number;
  avgBuy: number | null;
  avgSell: number | null;
  /** Preço médio de venda menos o de compra, por dd. */
  margin: number | null;
  /** Lucro só do que foi vendido (cada venda contra o custo médio na hora). */
  realized: number;
  /** Estoque ao fim do ciclo inteiro (não muda com os filtros). */
  stock: number;
  avgCost: number;
  stockValue: number;
  /** dd vendidos além do que havia em estoque (aviso de lançamento faltando). */
  oversold: number;
};

/** Totais dos lançamentos visíveis (já filtrados). O estoque vem do ciclo inteiro (`all`), pois é um estado, não um período. */
export function summarize(visible: TradeCalc[], all: TradeCalc[]): Summary {
  let spent = 0, received = 0, bought = 0, sold = 0, realized = 0;
  for (const t of visible) {
    if (t.kind === "buy") {
      spent += t.total;
      bought += t.quantity;
    } else if (t.kind === "sell") {
      received += t.total;
      sold += t.quantity;
      realized += t.profit ?? 0;
    }
  }
  const last = all[all.length - 1];
  const avgBuy = bought > 0 ? spent / bought : null;
  const avgSell = sold > 0 ? received / sold : null;
  return {
    spent, received, balance: received - spent, bought, sold, avgBuy, avgSell,
    margin: avgBuy !== null && avgSell !== null ? avgSell - avgBuy : null,
    realized,
    stock: last?.stockAfter ?? 0,
    avgCost: last?.avgCostAfter ?? 0,
    stockValue: (last?.stockAfter ?? 0) * (last?.avgCostAfter ?? 0),
    oversold: all.reduce((n, t) => n + t.oversold, 0),
  };
}

// ---------- filtros (calendário de Brasília, UTC-3) ----------

const DAY = 86_400_000;
const BRASILIA_MS = -3 * 3600_000;
const startOfDay = (ms: number) => Math.floor((ms + BRASILIA_MS) / DAY) * DAY - BRASILIA_MS;

export type Period = "today" | "7d" | "30d" | "all" | "custom";
export type KindFilter = "all" | "buy" | "sell";

/** Intervalo do filtro em milissegundos (`null` = sem limite). `custom` usa datas "AAAA-MM-DD", inclusive nas duas pontas. */
export function periodRange(period: Period, custom: { from?: string; to?: string } = {}, now: number = Date.now()): { from: number | null; to: number | null } {
  const today = startOfDay(now);
  if (period === "today") return { from: today, to: null };
  if (period === "7d") return { from: today - 6 * DAY, to: null };
  if (period === "30d") return { from: today - 29 * DAY, to: null };
  if (period === "custom") {
    const from = custom.from ? Date.parse(`${custom.from}T00:00:00-03:00`) : NaN;
    const to = custom.to ? Date.parse(`${custom.to}T23:59:59.999-03:00`) : NaN;
    return { from: Number.isNaN(from) ? null : from, to: Number.isNaN(to) ? null : to };
  }
  return { from: null, to: null };
}

export function filterTrades(calcs: TradeCalc[], range: { from: number | null; to: number | null }, kind: KindFilter): TradeCalc[] {
  return calcs.filter((t) => {
    const time = Date.parse(t.tradedAt);
    if (range.from !== null && time < range.from) return false;
    if (range.to !== null && time > range.to) return false;
    return kind === "all" || t.kind === kind || (kind === "buy" && t.kind === "carry");
  });
}

// ---------- digitação e formatação ----------

/**
 * Lê um número digitado: "380000", "380.000", "380k" (×1.000), "1,5kk" ou "1.5m" (×1.000.000).
 * Devolve um inteiro, ou `null` se não entender ou se não for inteiro (ex.: "1,5" sem k).
 */
export function parseAmount(raw: string): number | null {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  const m = text.match(/^([\d.,]+)(kk|k|m)?$/);
  if (!m) return null;
  const [, digits, suffix] = m;
  const mult = suffix === "k" ? 1_000 : suffix ? 1_000_000 : 1;

  let value: number;
  if (/^\d{1,3}(\.\d{3})+$/.test(digits)) value = Number(digits.replace(/\./g, "")); // 380.000
  else if (/^\d{1,3}(,\d{3})+$/.test(digits)) value = Number(digits.replace(/,/g, "")); // 380,000
  else if (/^\d+([.,]\d+)?$/.test(digits)) value = Number(digits.replace(",", ".")); // 380 ou 1,5 (com k/m)
  else return null;

  const result = value * mult;
  const rounded = Math.round(result);
  return Math.abs(result - rounded) < 1e-6 && Number.isSafeInteger(rounded) ? rounded : null;
}

export const fmt = (n: number) => Math.round(n).toLocaleString("pt-BR");

/** "380k", "1,5M": versão curta para valores grandes. */
export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  const short = (v: number, s: string) => `${(Math.round(v * 100) / 100).toLocaleString("pt-BR")}${s}`;
  if (abs >= 1_000_000) return short(n / 1_000_000, "M");
  if (abs >= 1_000) return short(n / 1_000, "k");
  return fmt(n);
}

/** "+1.500.000" / "−300.000": com sinal, para lucro e saldo. */
export const fmtSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${fmt(Math.abs(n))}`;
