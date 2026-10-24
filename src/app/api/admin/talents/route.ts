import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { isTalentCategory, MAX_ITEM_QUANTITY, MAX_TALENT_ITEMS, MAX_TALENT_TEXT } from "@/config/talents";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETUP_HINT = "As tabelas de talentos ainda não existem no banco. Rode o arquivo supabase/migrations/0006_talents.sql no SQL Editor do Supabase e tente de novo.";
const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type DbError = { code?: string; message?: string };
const isSetupMissing = (e: DbError) => ["42P01", "42883", "PGRST205", "PGRST202"].includes(e.code ?? "") || /talents|save_talent_category/i.test(e.message ?? "");

type Row = { id: number; category: string; position: number; description: string; talent_requirements: { item_id: number; quantity: number; position: number }[] };

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const { data, error } = await createAdminClient()
      .from("talents")
      .select("id, category, position, description, talent_requirements(item_id, quantity, position)")
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (error) return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível consultar os talentos.", 500);

    const talents = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: r.id,
      category: r.category,
      description: r.description,
      requirements: [...r.talent_requirements].sort((a, b) => a.position - b.position).map((q) => ({ itemId: q.item_id, quantity: q.quantity })),
    }));
    return NextResponse.json({ talents });
  } catch {
    return fail("Erro interno ao consultar os talentos.", 500);
  }
}

/** Salva todos os talentos de UMA categoria (a lista enviada vira a lista oficial dela). */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { category?: unknown; talents?: unknown } | null;
    const category = typeof body?.category === "string" ? body.category : "";
    if (!isTalentCategory(category)) return fail("Categoria inválida.");
    if (!Array.isArray(body?.talents) || body.talents.length > 60) return fail("Lista de talentos inválida (até 60 por categoria).");

    const talents: { id: number | null; description: string; requirements: { itemId: number; quantity: number }[] }[] = [];
    for (const [index, raw] of body.talents.entries()) {
      const label = `Talento ${index + 1}`;
      const t = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
      const description = typeof t.description === "string" ? t.description.trim().replace(/\s+/g, " ") : "";
      if (!description || description.length > MAX_TALENT_TEXT) return fail(`${label}: escreva o bônus (até ${MAX_TALENT_TEXT} letras).`);

      const reqRaw = Array.isArray(t.requirements) ? t.requirements : [];
      if (reqRaw.length > MAX_TALENT_ITEMS) return fail(`${label}: no máximo ${MAX_TALENT_ITEMS} itens.`);
      const seen = new Set<number>();
      const requirements: { itemId: number; quantity: number }[] = [];
      for (const q of reqRaw) {
        const r = (typeof q === "object" && q !== null ? q : {}) as Record<string, unknown>;
        const itemId = Number(r.itemId);
        const quantity = Number(r.quantity);
        if (!Number.isInteger(itemId) || itemId <= 0) return fail(`${label}: item inválido.`);
        if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ITEM_QUANTITY) return fail(`${label}: a quantidade deve ser um número inteiro de 1 a ${MAX_ITEM_QUANTITY}.`);
        if (seen.has(itemId)) return fail(`${label}: o mesmo item aparece duas vezes.`);
        seen.add(itemId);
        requirements.push({ itemId, quantity });
      }
      const idNum = Number(t.id);
      talents.push({ id: Number.isInteger(idNum) && idNum > 0 ? idNum : null, description, requirements });
    }

    const { error } = await createAdminClient().rpc("save_talent_category", { p_category: category, p_talents: talents });
    if (error) {
      if (error.code === "23503") return fail("Algum item não existe mais. Recarregue a página e tente de novo.", 409);
      return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível salvar os talentos.", 500);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Erro interno ao salvar os talentos.", 500);
  }
}
