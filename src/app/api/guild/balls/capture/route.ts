import { NextResponse } from "next/server";
import { BALL_IMAGE_MAX_BYTES, parseCaptureInput } from "@/config/guildBalls";
import { BallsError, captureProject } from "@/lib/guild/ballsData";
import { postCaptureImage } from "@/lib/guild/ballsDiscord";
import { GuildDataError } from "@/lib/guild/boostData";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (error: string, status = 400) => json({ error }, status);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const SPRITE_PREFIX = "data:image/png;base64,";
const SPRITE_MAX_CHARS = 250_000;

/**
 * Encerra um projeto como capturado e comemora no Discord.
 * Formulário: `data` (JSON: projeto, Pokémon, ball e balls gastas), `image` (PNG do cartão "Capturado") e `sprite` (opcional).
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
      return fail("Dados da captura inválidos.");
    }
    const input = parseCaptureInput(parsed);
    if (!input) return fail("Não entendi os dados da captura. Confira o Pokémon, a ball e a quantidade.");

    const image = form.get("image");
    if (!(image instanceof Blob) || image.size === 0 || image.size > BALL_IMAGE_MAX_BYTES) return fail("A imagem do projeto está ausente ou grande demais.");
    const head = new Uint8Array(await image.slice(0, 8).arrayBuffer());
    if (!PNG_SIGNATURE.every((b, i) => head[i] === b)) return fail("A imagem precisa ser um PNG.");

    const spriteField = form.get("sprite");
    const sprite = typeof spriteField === "string" && spriteField ? spriteField : null;
    if (sprite && (!sprite.startsWith(SPRITE_PREFIX) || sprite.length > SPRITE_MAX_CHARS || !/^[A-Za-z0-9+/=]+$/.test(sprite.slice(SPRITE_PREFIX.length)))) return fail("Arte do Pokémon inválida.");

    const result = await captureProject(me.id, input, sprite);
    const discord = await postCaptureImage({ data: result.data, image, by: me.name, ball: input.ball, spent: input.spent, others: input.balls.filter((b) => b.name !== input.ball), stats: result.stats });
    return json({ ok: true, id: result.id, total: result.total, created: result.created, discord });
  } catch (e) {
    if (e instanceof BallsError) return fail(e.message, e.status);
    if (e instanceof GuildDataError) return fail(e.message, 500);
    return fail("Erro interno ao registrar a captura.", 500);
  }
}
