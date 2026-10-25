import { NextResponse } from "next/server";
import { isBoostType } from "@/config/guildBoost";
import { GuildDataError, listMembers, saveWants } from "@/lib/guild/boostData";
import { getMemberSessionId } from "@/lib/guild/boostSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);

/** Salva os tipos que o membro logado quer receber (a lista enviada vira a lista dele; vazia = nenhum). */
export async function PUT(request: Request) {
  try {
    const id = await getMemberSessionId();
    if (!id) return fail("Entre com o seu nick primeiro.", 401);
    if (!(await listMembers()).some((m) => m.id === id)) return fail("Esse membro não está mais na guilda. Entre de novo.", 401);

    const body = (await request.json().catch(() => null)) as { types?: unknown } | null;
    if (!Array.isArray(body?.types) || body.types.length > 40 || !body.types.every(isBoostType)) return fail("Lista de tipos inválida.");

    const types = [...new Set(body.types as string[])];
    await saveWants(id, types);
    return json({ types });
  } catch (e) {
    if (e instanceof GuildDataError) return fail(e.message, (e as { code?: string }).code === "23503" ? 401 : 500);
    return fail("Erro interno ao salvar os boosts.", 500);
  }
}
