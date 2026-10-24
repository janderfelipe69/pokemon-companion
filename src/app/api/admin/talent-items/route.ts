import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { ITEM_BUCKET } from "@/lib/talents/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 1024 * 1024;
const SETUP_HINT = "As tabelas de itens ainda não estão prontas no banco. Rode o arquivo supabase/migrations/0006_talents.sql no SQL Editor do Supabase e tente de novo.";
const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type DbError = { code?: string; message?: string };
const isSetupMissing = (e: DbError) =>
  ["42P01", "42703", "PGRST205", "PGRST204"].includes(e.code ?? "") || /talent_items|image_path|bucket not found/i.test(e.message ?? "");

/** Confere o conteúdo do arquivo (não só a extensão). */
function detectImage(b: Buffer): { ext: string; mime: string } | null {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 6 && (b.subarray(0, 6).toString("latin1") === "GIF87a" || b.subarray(0, 6).toString("latin1") === "GIF89a")) return { ext: "gif", mime: "image/gif" };
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

const parseName = (raw: unknown): string | null => {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  return /^[\p{L}\p{N} .,'’:()&+/!-]{1,60}$/u.test(name) ? name : null;
};

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

type ItemRow = { id: number; name: string; image_path: string | null };
const toItem = (r: ItemRow) => ({ id: r.id, name: r.name, imagePath: r.image_path });

export async function GET() {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const db = createAdminClient();
    const { data, error } = await db.from("talent_items").select("id, name, image_path").order("name", { ascending: true });
    if (error) return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível consultar os itens.", 500);

    const uses = new Map<number, number>();
    const { data: reqs } = await db.from("talent_requirements").select("item_id");
    for (const r of (reqs ?? []) as { item_id: number }[]) uses.set(r.item_id, (uses.get(r.item_id) ?? 0) + 1);

    return NextResponse.json({ items: ((data ?? []) as ItemRow[]).map((r) => ({ ...toItem(r), uses: uses.get(r.id) ?? 0 })) });
  } catch {
    return fail("Erro interno ao consultar os itens.", 500);
  }
}

/**
 * Envia uma imagem (multipart: file + name, ou file + id para trocar a imagem de um item).
 * Sem `id`: se já existe um item com esse nome, só troca a imagem dele.
 */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("Envio inválido.");
    }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return fail("Escolha uma imagem.");
    if (file.size > MAX_BYTES) return fail("A imagem passa de 1 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const kind = detectImage(bytes);
    if (!kind) return fail("Formato não aceito. Use PNG, JPG, GIF ou WebP.");

    const db = createAdminClient();
    const idRaw = form.get("id");
    const rename = form.get("name") ? parseName(form.get("name")) : null;
    if (form.get("name") && !rename) return fail("Nome inválido (até 60 letras, sem símbolos estranhos).");

    let item: ItemRow | null = null;
    let created = false;

    if (idRaw) {
      const id = Number(idRaw);
      if (!Number.isInteger(id) || id <= 0) return fail("Item inválido.");
      const found = await db.from("talent_items").select("id, name, image_path").eq("id", id).maybeSingle();
      if (found.error) return fail(isSetupMissing(found.error) ? SETUP_HINT : "Não foi possível consultar o item.", 500);
      if (!found.data) return fail("Esse item não existe mais.", 404);
      item = found.data as ItemRow;
    } else {
      if (!rename) return fail("Informe o nome do item.");
      const found = await db.from("talent_items").select("id, name, image_path").ilike("name", escapeLike(rename)).limit(1);
      if (found.error) return fail(isSetupMissing(found.error) ? SETUP_HINT : "Não foi possível consultar os itens.", 500);
      item = ((found.data ?? [])[0] as ItemRow | undefined) ?? null;
      if (!item) {
        const inserted = await db.from("talent_items").insert({ name: rename }).select("id, name, image_path").single();
        if (inserted.error || !inserted.data) return fail(inserted.error && isSetupMissing(inserted.error) ? SETUP_HINT : "Não foi possível criar o item.", 500);
        item = inserted.data as ItemRow;
        created = true;
      }
    }

    const path = `${item.id}/${Date.now()}.${kind.ext}`;
    const uploaded = await db.storage.from(ITEM_BUCKET).upload(path, new Uint8Array(bytes), { contentType: kind.mime, cacheControl: "31536000", upsert: false });
    if (uploaded.error) {
      if (created) await db.from("talent_items").delete().eq("id", item.id);
      return fail(/bucket not found/i.test(uploaded.error.message) ? SETUP_HINT : "Não foi possível guardar a imagem.", 500);
    }

    const patch: { image_path: string; name?: string } = { image_path: path };
    if (idRaw && rename) patch.name = rename;
    const updated = await db.from("talent_items").update(patch).eq("id", item.id).select("id, name, image_path").single();
    if (updated.error || !updated.data) {
      await db.storage.from(ITEM_BUCKET).remove([path]);
      if (created) await db.from("talent_items").delete().eq("id", item.id);
      return fail(updated.error?.code === "23505" ? "Já existe um item com esse nome." : "Não foi possível salvar o item.", updated.error?.code === "23505" ? 409 : 500);
    }

    if (item.image_path && item.image_path !== path) await db.storage.from(ITEM_BUCKET).remove([item.image_path]);
    return NextResponse.json({ item: toItem(updated.data as ItemRow), created });
  } catch {
    return fail("Erro interno ao enviar a imagem.", 500);
  }
}

/** Renomeia um item. */
export async function PATCH(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { id?: unknown; name?: unknown } | null;
    const id = Number(body?.id);
    const name = parseName(body?.name);
    if (!Number.isInteger(id) || id <= 0) return fail("Item inválido.");
    if (!name) return fail("Nome inválido (até 60 letras, sem símbolos estranhos).");

    const { data, error } = await createAdminClient().from("talent_items").update({ name }).eq("id", id).select("id, name, image_path").maybeSingle();
    if (error) return fail(error.code === "23505" ? "Já existe um item com esse nome." : isSetupMissing(error) ? SETUP_HINT : "Não foi possível renomear o item.", error.code === "23505" ? 409 : 500);
    if (!data) return fail("Esse item não existe mais.", 404);
    return NextResponse.json({ item: toItem(data as ItemRow) });
  } catch {
    return fail("Erro interno ao renomear o item.", 500);
  }
}

/** Remove um item (só se nenhum talento ou drop usar). */
export async function DELETE(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return fail("Item inválido.");

    const db = createAdminClient();
    const { data, error } = await db.from("talent_items").delete().eq("id", id).select("image_path").maybeSingle();
    if (error) return fail(error.code === "23503" ? "Esse item está em uso (num talento ou drop). Tire-o de lá antes de remover." : "Não foi possível remover o item.", error.code === "23503" ? 409 : 500);
    const path = (data as { image_path: string | null } | null)?.image_path;
    if (path) await db.storage.from(ITEM_BUCKET).remove([path]);
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Erro interno ao remover o item.", 500);
  }
}
