import { after, NextResponse } from "next/server";
import { GuildDataError, listMembers, setTransfersDone } from "@/lib/guild/boostData";
import { getMemberSessionId } from "@/lib/guild/boostSession";
import { isDiscordConfigured, syncDiscordPlan } from "@/lib/guild/discord";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Marca ou desmarca trocas como feitas: `{ ids: number[], done: boolean }`. Só quem entrega ou recebe pode marcar. */
export async function PATCH(request: Request) {
  try {
    const id = await getMemberSessionId();
    if (!id || !(await listMembers()).some((m) => m.id === id)) return json({ error: "Entre com o seu nick primeiro." }, 401);

    const body = (await request.json().catch(() => null)) as { ids?: unknown; done?: unknown } | null;
    const ids = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 200 || !ids.every((n) => Number.isInteger(n) && (n as number) > 0) || typeof body?.done !== "boolean") return json({ error: "Pedido inválido." }, 400);

    const changed = await setTransfersDone(id, ids as number[], body.done);
    if (changed !== ids.length) return json({ error: "Só quem entrega ou recebe pode marcar essa troca." }, 403);
    if (isDiscordConfigured()) after(() => syncDiscordPlan({ minIntervalMs: 3000 }));
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof GuildDataError ? e.message : "Erro interno ao marcar a troca." }, 500);
  }
}
