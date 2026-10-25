import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { isBoostType } from "@/config/guildBoost";
import { GuildDataError, isSetupMissing, listMembers, listWants, saveWants, SETUP_HINT } from "@/lib/guild/boostData";
import { isValidNick, normalizeNick } from "@/lib/guild/boostMembers";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
const failData = (e: unknown) => (e instanceof GuildDataError ? fail(e.message, 500) : fail("Erro interno ao consultar a guilda.", 500));

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const [members, wants] = await Promise.all([listMembers(), listWants()]);
    return NextResponse.json({ members: members.map((m) => ({ ...m, types: wants.get(m.id) ?? [] })) });
  } catch (e) {
    return failData(e);
  }
}

/** Adiciona membros: { names: ["Nick 1", "Nick 2"] }. Quem já existe é ignorado. */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { names?: unknown } | null;
    if (!Array.isArray(body?.names) || body.names.length === 0 || body.names.length > 300) return fail("Informe de 1 a 300 nicks.");

    const wanted: string[] = [];
    const seen = new Set<string>();
    for (const raw of body.names) {
      const name = typeof raw === "string" ? normalizeNick(raw) : "";
      if (!isValidNick(name)) return fail(`Nick inválido: “${String(raw).slice(0, 50)}” (de 1 a 40 caracteres, sem < ou >).`);
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        wanted.push(name);
      }
    }

    const existing = new Set((await listMembers()).map((m) => normalizeNick(m.name).toLowerCase()));
    const toAdd = wanted.filter((n) => !existing.has(n.toLowerCase()));
    const skipped = wanted.filter((n) => existing.has(n.toLowerCase()));

    if (toAdd.length > 0) {
      const { error } = await createAdminClient().from("guild_members").insert(toAdd.map((name) => ({ name })));
      if (error) return fail(error.code === "23505" ? "Algum desses nicks já existe." : isSetupMissing(error) ? SETUP_HINT : "Não foi possível adicionar os membros.", error.code === "23505" ? 409 : 500);
    }
    return NextResponse.json({ added: toAdd, skipped });
  } catch (e) {
    return failData(e);
  }
}

/** Troca o nick e/ou os tipos de um membro: { id, name?, types? }. */
export async function PATCH(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { id?: unknown; name?: unknown; types?: unknown } | null;
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return fail("Membro inválido.");

    const db = createAdminClient();
    if (body?.name !== undefined) {
      const name = typeof body.name === "string" ? normalizeNick(body.name) : "";
      if (!isValidNick(name)) return fail("Nick inválido (de 1 a 40 caracteres, sem < ou >).");
      const { data, error } = await db.from("guild_members").update({ name }).eq("id", id).select("id").maybeSingle();
      if (error) return fail(error.code === "23505" ? "Já existe um membro com esse nick." : isSetupMissing(error) ? SETUP_HINT : "Não foi possível trocar o nick.", error.code === "23505" ? 409 : 500);
      if (!data) return fail("Esse membro não existe mais.", 404);
    }
    if (body?.types !== undefined) {
      if (!Array.isArray(body.types) || body.types.length > 40 || !body.types.every(isBoostType)) return fail("Lista de tipos inválida.");
      try {
        await saveWants(id, [...new Set(body.types as string[])]);
      } catch (e) {
        if (e instanceof GuildDataError && (e as { code?: string }).code === "23503") return fail("Esse membro não existe mais.", 404);
        throw e;
      }
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failData(e);
  }
}

/** Remove um membro (as escolhas dele saem junto). */
export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return fail("Membro inválido.");
    const { error } = await createAdminClient().from("guild_members").delete().eq("id", id);
    if (error) return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível remover o membro.", isSetupMissing(error) ? 500 : 500);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failData(e);
  }
}
