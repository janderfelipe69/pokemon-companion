import { NextResponse } from "next/server";
import { parseBannerSettings } from "@/config/guildBanners";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { GuildSettingsError, getGuildSettings, saveGuildSettings } from "@/lib/guild/guildSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failAny = (e: unknown) => (e instanceof GuildSettingsError ? fail(e.message, e.status) : fail("Erro interno no banner da guilda.", 500));

/** Banner em uso e nível da guilda. Só o admin. */
export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return fail("Não autorizado.", 401);
    return json(await getGuildSettings());
  } catch (e) {
    return failAny(e);
  }
}

/** Troca o banner e/ou o nível da guilda: `{ banner, level }`. Só o admin; a conferência é feita aqui, não na tela. */
export async function PUT(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return fail("Não autorizado.", 401);
    const parsed = parseBannerSettings(await request.json().catch(() => null));
    if (typeof parsed === "string") return fail(parsed);
    await saveGuildSettings(parsed);
    return json({ ok: true, ...parsed });
  } catch (e) {
    return failAny(e);
  }
}
