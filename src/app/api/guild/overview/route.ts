import { NextResponse } from "next/server";
import { GuildDataError, listMembers, listWants } from "@/lib/guild/boostData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Todos os membros e o que cada um quer (tipos e níveis): é o que a aba "Drops do boss" usa para mostrar quem precisa de cada stone. */
export async function GET() {
  try {
    const [members, wants] = await Promise.all([listMembers(), listWants()]);
    const people = members.map((m) => ({ name: m.name, wants: wants.get(m.id) ?? [] })).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    return NextResponse.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof GuildDataError ? e.message : "Erro interno ao consultar a guilda." }, { status: 500 });
  }
}
