
import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIERS } from "@/types/pokemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePrice(value: unknown): number | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return undefined;

  const number = Number(text);
  if (!Number.isFinite(number) || number < 0) return undefined;

  return number;
}

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("tier_prices")
      .select("tier_code, price_kk, price_brl");

    if (error) {
      console.error("[admin/tier-prices] Falha ao consultar preços.");
      return NextResponse.json(
        { error: "Não foi possível consultar os preços." },
        { status: 500 }
      );
    }

    return NextResponse.json({ prices: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao consultar os preços." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) {
      return NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();

    if (typeof body !== "object" || body === null) {
      return NextResponse.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;
    const tierCode = data.tierCode;

    if (
      typeof tierCode !== "string" ||
      !TIERS.some((tier) => tier === tierCode)
    ) {
      return NextResponse.json(
        { error: "Tier inválido." },
        { status: 400 }
      );
    }

    const priceKk = parsePrice(data.priceKk);
    const priceBrl = parsePrice(data.priceBrl);

    if (priceKk === undefined || priceBrl === undefined) {
      return NextResponse.json(
        { error: "Informe preços válidos e não negativos." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("tier_prices")
      .upsert(
        {
          tier_code: tierCode,
          price_kk: priceKk,
          price_brl: priceBrl,
        },
        { onConflict: "tier_code" }
      );

    if (error) {
      console.error("[admin/tier-prices] Falha ao salvar preço.");
      return NextResponse.json(
        { error: "Não foi possível salvar os preços." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao salvar os preços." },
      { status: 500 }
    );
  }
}
