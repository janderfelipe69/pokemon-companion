import { NextResponse } from "next/server";
import { parseWants } from "@/config/guildBoost";
import { GuildDataError, listMembers, saveWants } from "@/lib/guild/boostData";
import { getMemberSessionId } from "@/lib/guild/boostSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);

/** Salva o que o membro logado quer receber: `{ wants: [{ type, tiers }] }` (a lista enviada vira a lista dele; vazia = nenhum). */
export async function PUT(request: Request) {
  try {
    const id = await getMemberSessionId();
    if (!id) return fail("Entre com o seu nick primeiro.", 401);
    if (!(await listMembers()).some((m) => m.id === id)) return fail("Esse membro não está mais na guilda. Entre de novo.", 401);

    const body = (await request.json().catch(() => null)) as { wants?: unknown } | null;
    const wants = parseWants(body?.wants);
    if (!wants) return fail("Lista de boosts inválida.");

    await saveWants(id, wants);
    return json({ wants });
  } catch (e) {
    if (e instanceof GuildDataError) return fail(e.message, (e as { code?: string }).code === "23503" ? 401 : 500);
    return fail("Erro interno ao salvar os boosts.", 500);
  }
}
