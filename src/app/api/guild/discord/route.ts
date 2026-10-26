import { NextResponse } from "next/server";
import { listMembers } from "@/lib/guild/boostData";
import { getMemberSessionId } from "@/lib/guild/boostSession";
import { isDiscordConfigured, syncDiscordPlan } from "@/lib/guild/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Reenvia o plano atual ao Discord (edita a mensagem da rodada). Só para quem está logado, no máximo uma vez a cada 15 s. */
export async function POST() {
  try {
    const id = await getMemberSessionId();
    if (!id || !(await listMembers()).some((m) => m.id === id)) return json({ error: "Entre com o seu nick primeiro." }, 401);
    if (!isDiscordConfigured()) return json({ error: "O Discord ainda não foi configurado no site." }, 400);

    const result = await syncDiscordPlan({ minIntervalMs: 15_000 });
    if (!result.ok) return json({ error: "Não foi possível atualizar o Discord. Tente de novo em instantes." }, 502);
    return json({ ok: true, skipped: result.skipped ?? null });
  } catch {
    return json({ error: "Erro interno ao falar com o Discord." }, 500);
  }
}
