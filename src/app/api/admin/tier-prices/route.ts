import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { compareDecimal, parsePrice, type Currency } from "@/lib/money";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS } from "@/types/pokemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIGRATION_HINT =
  "O banco ainda não tem as colunas de faixa. Rode o arquivo supabase/migrations/0004_tier_price_ranges.sql no SQL Editor do Supabase e tente de novo.";

/** Postgres: coluna inexistente (migração 0004 ainda não aplicada). */
const isMissingColumn = (error: { code?: string; message?: string }) =>
  error.code === "42703" || /price_(kk|brl)_max/.test(error.message ?? "");

const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();

    const supabase = createAdminClient();
    let { data, error } = await supabase
      .from("tier_prices")
      .select("tier_code, price_kk::text, price_kk_max::text, price_brl::text, price_brl_max::text");

    if (error && isMissingColumn(error)) {
      // Migração 0004 pendente: mostra o que existe (só o mínimo) e avisa ao salvar.
      const legacy = await supabase.from("tier_prices").select("tier_code, price_kk::text, price_brl::text");
      data = legacy.data as typeof data;
      error = legacy.error;
    }

    if (error) {
      console.error("[admin/tier-prices] Falha ao consultar preços.");
      return NextResponse.json({ error: "Não foi possível consultar os preços." }, { status: 500 });
    }

    return NextResponse.json({ prices: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Erro interno ao consultar os preços." }, { status: 500 });
  }
}

/** Aceita texto, número ou vazio. `undefined` = tipo inválido. */
function asText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : undefined;
  return typeof value === "string" ? value : undefined;
}

type ParsedTier = {
  tier_code: string;
  price_kk: string | null;
  price_kk_max: string | null;
  price_brl: string | null;
  price_brl_max: string | null;
};

function parseItem(raw: unknown, errors: string[]): ParsedTier | null {
  if (typeof raw !== "object" || raw === null) {
    errors.push("Dados inválidos.");
    return null;
  }
  const item = raw as Record<string, unknown>;
  const tier = TIERS.find((t) => t === item.tierCode);
  if (!tier) {
    errors.push("Tier inválido.");
    return null;
  }

  const before = errors.length;
  const pair = (minRaw: unknown, maxRaw: unknown, currency: Currency, label: string) => {
    const texts = [asText(minRaw), asText(maxRaw)];
    if (texts.some((t) => t === undefined)) {
      errors.push(`${tier}: valor inválido em ${label}.`);
      return { min: null, max: null };
    }
    const [min, max] = texts.map((t) => parsePrice(t, currency));
    if (!min.ok || !max.ok) {
      errors.push(`${tier}: ${(!min.ok ? min : (max as { ok: false; error: string })).error}`);
      return { min: null, max: null };
    }
    if (max.value !== null && min.value === null) {
      errors.push(`${tier}: preencha o mínimo de ${label} (ou apague o máximo).`);
    } else if (max.value !== null && min.value !== null && compareDecimal(max.value, min.value) < 0) {
      errors.push(`${tier}: o máximo de ${label} não pode ser menor que o mínimo.`);
    }
    return { min: min.value, max: max.value };
  };

  const kk = pair(item.kkMin, item.kkMax, "kk", "KK");
  const brl = pair(item.brlMin, item.brlMax, "brl", "R$");
  if (errors.length > before) return null;

  return { tier_code: tier, price_kk: kk.min, price_kk_max: kk.max, price_brl: brl.min, price_brl_max: brl.max };
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();

    const body: unknown = await request.json();
    const items = typeof body === "object" && body !== null ? (body as { items?: unknown }).items : undefined;

    if (!Array.isArray(items) || items.length === 0 || items.length > TIERS.length) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const errors: string[] = [];
    const rows = items.map((raw) => parseItem(raw, errors)).filter((r): r is ParsedTier => r !== null);
    if (errors.length > 0) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase.from("tier_prices").upsert(rows, { onConflict: "tier_code" });

    if (error) {
      console.error("[admin/tier-prices] Falha ao salvar preço.");
      return NextResponse.json(
        { error: isMissingColumn(error) ? MIGRATION_HINT : "Não foi possível salvar os preços." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, saved: rows.length });
  } catch {
    return NextResponse.json({ error: "Erro interno ao salvar os preços." }, { status: 500 });
  }
}
