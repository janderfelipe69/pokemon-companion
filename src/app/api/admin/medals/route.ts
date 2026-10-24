import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isIntegerStat } from "@/data/medals";
import { MEDAL_SELECT } from "@/lib/supabase/medals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE_HINT =
  "A tabela de medalhas ainda não existe no banco. Rode o arquivo supabase/migrations/0005_medals.sql no SQL Editor do Supabase e tente de novo.";
const isMissingTable = (error: { code?: string; message?: string }) =>
  error.code === "42P01" || error.code === "PGRST205" || /relation .*medals|medals.*schema cache/i.test(error.message ?? "");

const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const { data, error } = await createAdminClient().from("medals").select(MEDAL_SELECT).order("id", { ascending: true });
    if (error) {
      console.error("[admin/medals] Falha ao consultar medalhas.");
      return NextResponse.json({ error: isMissingTable(error) ? TABLE_HINT : "Não foi possível consultar as medalhas." }, { status: 500 });
    }
    return NextResponse.json({ medals: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Erro interno ao consultar as medalhas." }, { status: 500 });
  }
}

/** Valor opcional (vazio = não cadastrado). `undefined` = inválido. Aceita vírgula ou ponto. */
function parseValue(raw: unknown): number | null | undefined {
  if (raw === null || raw === undefined || raw === "") return null;
  const text = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw.trim().replace(",", ".") : "";
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(text)) return undefined;
  return Number(text);
}

/** Nome de buff: texto curto, sem símbolos estranhos (as chaves conhecidas, como "damage", também passam). */
const parseStat = (raw: unknown): string | undefined => {
  if (typeof raw !== "string") return undefined;
  const text = raw.trim().replace(/\s+/g, " ");
  return /^[\p{L}\p{N} .'%/()+-]{2,40}$/u.test(text) ? text : undefined;
};

type ParsedMedal = {
  id: number;
  name: string;
  sprite_id: number | null;
  plus_stat: string;
  plus_value: number | null;
  minus_stat: string | null;
  minus_value: number | null;
};

function parseMedal(raw: unknown, errors: string[]): ParsedMedal | null {
  if (typeof raw !== "object" || raw === null) {
    errors.push("Dados inválidos.");
    return null;
  }
  const m = raw as Record<string, unknown>;
  const id = Number(m.id);
  const label = Number.isInteger(id) && id > 0 ? `#${id}` : "Medalha";
  const problem = (text: string) => {
    errors.push(`${label}: ${text}`);
    return null;
  };

  if (!Number.isInteger(id) || id <= 0 || id > 99999) return problem("número inválido.");
  const name = typeof m.name === "string" ? m.name.trim() : "";
  if (name.length < 1 || name.length > 60) return problem("informe o nome (até 60 letras).");

  const spriteRaw = m.spriteId === null || m.spriteId === undefined || m.spriteId === "" ? null : Number(m.spriteId);
  if (spriteRaw !== null && (!Number.isInteger(spriteRaw) || spriteRaw <= 0 || spriteRaw > 99999)) return problem("número da imagem inválido.");

  const plus = parseStat(m.plus);
  if (!plus) return problem("escolha o buff.");
  const plusValue = parseValue(m.plusValue);
  if (plusValue === undefined) return problem("valor do buff inválido (use números, com até 2 casas decimais).");

  if (plusValue !== null && isIntegerStat(plus) && !Number.isInteger(plusValue)) return problem("velocidade do buff é número inteiro (ex.: 5).");

  const hasMinus = m.minus !== null && m.minus !== undefined && m.minus !== "";
  const minus = hasMinus ? parseStat(m.minus) : null;
  if (hasMinus && !minus) return problem("debuff inválido.");
  const minusValue = hasMinus ? parseValue(m.minusValue) : null;
  if (minusValue === undefined) return problem("valor do debuff inválido (use números, com até 2 casas decimais).");

  if (minus && minusValue !== null && isIntegerStat(minus) && !Number.isInteger(minusValue)) return problem("velocidade do debuff é número inteiro (ex.: 5).");

  return { id, name, sprite_id: spriteRaw, plus_stat: plus, plus_value: plusValue, minus_stat: minus ?? null, minus_value: minusValue };
}

/** Cria ou atualiza medalhas (upsert pelo número). Corpo: { items: [...] }. */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();

    const body: unknown = await request.json();
    const items = typeof body === "object" && body !== null ? (body as { items?: unknown }).items : undefined;
    if (!Array.isArray(items) || items.length === 0 || items.length > 400) {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    const errors: string[] = [];
    const rows = items.map((raw) => parseMedal(raw, errors)).filter((r): r is ParsedMedal => r !== null);
    if (errors.length > 0) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

    const { error } = await createAdminClient().from("medals").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("[admin/medals] Falha ao salvar medalhas.");
      return NextResponse.json({ error: isMissingTable(error) ? TABLE_HINT : "Não foi possível salvar as medalhas." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, saved: rows.length });
  } catch {
    return NextResponse.json({ error: "Erro interno ao salvar as medalhas." }, { status: 500 });
  }
}

/** Remove uma medalha. Corpo: { id }. */
export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body: unknown = await request.json();
    const id = typeof body === "object" && body !== null ? Number((body as { id?: unknown }).id) : NaN;
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Número inválido." }, { status: 400 });

    const { error } = await createAdminClient().from("medals").delete().eq("id", id);
    if (error) {
      console.error("[admin/medals] Falha ao remover medalha.");
      return NextResponse.json({ error: "Não foi possível remover a medalha." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno ao remover a medalha." }, { status: 500 });
  }
}
