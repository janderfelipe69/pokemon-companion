import type { DecimalString } from "@/types/pokemon";

export type Currency = "kk" | "brl";

const RULES: Record<Currency, { label: string; maxDecimals: number }> = {
  kk: { label: "KK", maxDecimals: 4 },
  brl: { label: "R$", maxDecimals: 2 },
};
const MAX_INTEGER_DIGITS = 15;

export const NOT_DEFINED = "Não definido";

export type ParseResult = { ok: true; value: DecimalString | null } | { ok: false; error: string };

/**
 * Valida um preço digitado e devolve o texto canônico.
 * Vazio/null = limpar o preço (não definido). "0" é aceito como preço explícito.
 * Aceita só dígitos com vírgula ou ponto decimal (sem separador de milhar, sem sinal).
 */
export function parsePrice(raw: string | null | undefined, currency: Currency): ParseResult {
  const { label, maxDecimals } = RULES[currency];
  const text = (raw ?? "").trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d+([.,]\d+)?$/.test(text)) {
    return { ok: false, error: `Preço em ${label} inválido: use só números, com vírgula ou ponto decimal, sem milhar e sem sinal negativo.` };
  }
  const [intRaw, fracRaw = ""] = text.replace(",", ".").split(".");
  const integer = intRaw.replace(/^0+(?=\d)/, "");
  const fraction = fracRaw.replace(/0+$/, "");
  if (integer.length > MAX_INTEGER_DIGITS) {
    return { ok: false, error: `Preço em ${label} grande demais (máximo de ${MAX_INTEGER_DIGITS} dígitos inteiros).` };
  }
  if (fraction.length > maxDecimals) {
    return { ok: false, error: `Preço em ${label} aceita no máximo ${maxDecimals} casas decimais.` };
  }
  return { ok: true, value: fraction ? `${integer}.${fraction}` : integer };
}

/** Compara dois valores canônicos sem converter para número (sem perda de precisão). */
export function compareDecimal(a: DecimalString, b: DecimalString): number {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  if (ai.length !== bi.length) return ai.length - bi.length;
  if (ai !== bi) return ai < bi ? -1 : 1;
  const size = Math.max(af.length, bf.length);
  const x = af.padEnd(size, "0");
  const y = bf.padEnd(size, "0");
  return x === y ? 0 : x < y ? -1 : 1;
}

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Ex.: "1500.5" -> "1.500,5 KK". */
export function formatKk(value: DecimalString | null | undefined): string {
  if (value == null) return NOT_DEFINED;
  const [integer, fraction] = value.split(".");
  return `${group(integer)}${fraction ? `,${fraction}` : ""} KK`;
}

/** Ex.: "1500.5" -> "R$ 1.500,50". */
export function formatBrl(value: DecimalString | null | undefined): string {
  if (value == null) return NOT_DEFINED;
  const [integer, fraction = ""] = value.split(".");
  return `R$ ${group(integer)},${fraction.padEnd(2, "0")}`;
}

/** Move a vírgula para a esquerda (texto canônico). Ex.: ("20000", 3) -> "20". */
function shiftLeft(value: DecimalString, places: number): DecimalString {
  const [integer, fraction = ""] = value.split(".");
  const padded = integer.padStart(places + 1, "0");
  const head = padded.slice(0, padded.length - places);
  const tail = (padded.slice(padded.length - places) + fraction).replace(/0+$/, "");
  return tail ? `${head}.${tail}` : head;
}

const comma = (value: DecimalString) => value.replace(".", ",");

/**
 * KK do jeito que a comunidade escreve: 800 -> "800kk", 20000 -> "20kkk", 2250 -> "2,25kkk".
 * Se não couber de forma exata (muitas casas), mostra o valor completo.
 */
export function formatKkCompact(value: DecimalString | null | undefined): string {
  if (value == null) return NOT_DEFINED;
  if (value.split(".")[0].length < 4) return `${comma(value)}kk`;
  const shifted = shiftLeft(value, 3);
  const [integer, fraction = ""] = shifted.split(".");
  return fraction.length <= 3 ? `${group(integer)}${fraction ? `,${fraction}` : ""}kkk` : formatKk(value);
}

/** R$ sem os centavos quando são zero: "R$ 40.000". */
function brlShort(value: DecimalString): string {
  const [integer, fraction = ""] = value.split(".");
  return `${group(integer)}${fraction ? `,${fraction.padEnd(2, "0")}` : ""}`;
}

/** "20kkk – 40kkk" (faixa) ou "20kkk" (valor fixo). */
export function formatKkRange(min: DecimalString | null | undefined, max?: DecimalString | null): string {
  if (min == null) return NOT_DEFINED;
  if (max == null || max === min) return formatKkCompact(min);
  return `${formatKkCompact(min)} – ${formatKkCompact(max)}`;
}

/** "R$ 40.000 – 80.000" (faixa) ou "R$ 40.000" (valor fixo). */
export function formatBrlRange(min: DecimalString | null | undefined, max?: DecimalString | null): string {
  if (min == null) return NOT_DEFINED;
  if (max == null || max === min) return `R$ ${brlShort(min)}`;
  return `R$ ${brlShort(min)} – ${brlShort(max)}`;
}
