import { NextResponse } from "next/server";
import { BALL_IMAGE_MAX_BYTES, parseBallData } from "@/config/guildBalls";
import { BallsError, deleteProject, listProjects, saveProject } from "@/lib/guild/ballsData";
import { isBallsDiscordConfigured, postBallsImage } from "@/lib/guild/ballsDiscord";
import { GuildDataError } from "@/lib/guild/boostData";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);
const failAny = (e: unknown) => (e instanceof BallsError || e instanceof GuildDataError ? fail(e.message, e instanceof BallsError ? e.status : 500) : fail("Erro interno nos projetos de balls.", 500));

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const SPRITE_PREFIX = "data:image/png;base64,";
const SPRITE_MAX_CHARS = 250_000;

/** Projetos salvos e se o Discord está configurado. Só para membros. */
export async function GET() {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    return json({ me: me.name, projects: await listProjects(), discord: isBallsDiscordConfigured() });
  } catch (e) {
    return failAny(e);
  }
}

/**
 * Salva (ou atualiza) um projeto e posta a imagem no Discord.
 * Formulário: `data` (JSON com Pokémon e balls), `image` (PNG do cartão) e `sprite` (opcional, arte enviada à mão).
 */
export async function POST(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);

    const form = await request.formData().catch(() => null);
    if (!form) return fail("Envio inválido.");

    let parsed: unknown;
    try {
      parsed = JSON.parse(String(form.get("data") ?? ""));
    } catch {
      return fail("Dados do projeto inválidos.");
    }
    const data = parseBallData(parsed);
    if (!data) return fail("Não entendi os dados. Confira se o texto tem o Pokémon e as balls (ex.: “Ultra Ball: 492”).");

    const image = form.get("image");
    if (!(image instanceof Blob) || image.size === 0 || image.size > BALL_IMAGE_MAX_BYTES) return fail("A imagem do projeto está ausente ou grande demais.");
    const head = new Uint8Array(await image.slice(0, 8).arrayBuffer());
    if (!PNG_SIGNATURE.every((b, i) => head[i] === b)) return fail("A imagem precisa ser um PNG.");

    const spriteField = form.get("sprite");
    const sprite = typeof spriteField === "string" && spriteField ? spriteField : null;
    if (sprite && (!sprite.startsWith(SPRITE_PREFIX) || sprite.length > SPRITE_MAX_CHARS || !/^[A-Za-z0-9+/=]+$/.test(sprite.slice(SPRITE_PREFIX.length)))) return fail("Arte do Pokémon inválida.");

    const saved = await saveProject(me.id, data, sprite);
    const discord = await postBallsImage({ data, image, by: me.name, previousTotal: saved.previousTotal, created: saved.created });
    return json({ ok: true, ...saved, discord });
  } catch (e) {
    return failAny(e);
  }
}

/** Apaga um projeto (só quem criou): `{ id }`. */
export async function DELETE(request: Request) {
  try {
    const me = await getCurrentMember();
    if (!me) return fail("Entre com o seu nick primeiro.", 401);
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    if (!Number.isInteger(body?.id) || (body!.id as number) < 1) return fail("Projeto inválido.");
    await deleteProject(me.id, body!.id as number);
    return json({ ok: true });
  } catch (e) {
    return failAny(e);
  }
}
