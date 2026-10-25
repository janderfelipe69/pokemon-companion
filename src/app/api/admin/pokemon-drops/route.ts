import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { isZone, MAX_DROP_QUANTITY, MAX_DROPS_PER_POKEMON } from "@/lib/drops/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETUP_HINT = "Os drops ainda não estão prontos no banco. Rode o arquivo supabase/migrations/0007_pokemon_drops.sql no SQL Editor do Supabase e tente de novo.";
const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type DbError = { code?: string; message?: string };
const isSetupMissing = (e: DbError) =>
  ["42P01", "42703", "42883", "PGRST205", "PGRST204", "PGRST202"].includes(e.code ?? "") || /zone|quantity_min|very_rare|save_pokemon_drops/i.test(e.message ?? "");

const validId = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);

type Row = { item_id: number; zone: string; quantity_min: number | null; quantity_max: number | null; chance: number | string | null; very_rare: boolean };

/** Drops de um Pokémon: GET ?pokemonId=marowak */
export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const pokemonId = new URL(request.url).searchParams.get("pokemonId");
    if (!validId(pokemonId)) return fail("Pokémon inválido.");

    const { data, error } = await createAdminClient()
      .from("pokemon_talent_drops")
      .select("item_id, zone, quantity_min, quantity_max, chance, very_rare")
      .eq("pokemon_id", pokemonId)
      .order("id", { ascending: true });
    if (error) return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível consultar os drops.", 500);

    return NextResponse.json({
      drops: ((data ?? []) as Row[]).map((r) => ({
        itemId: r.item_id,
        zone: r.zone,
        min: r.quantity_min,
        max: r.quantity_max,
        chance: r.chance == null ? null : Number(r.chance),
        veryRare: r.very_rare,
      })),
    });
  } catch {
    return fail("Erro interno ao consultar os drops.", 500);
  }
}

/** Salva todos os drops de UM Pokémon (a lista enviada vira a lista oficial dele; lista vazia limpa). */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { pokemonId?: unknown; drops?: unknown } | null;
    if (!validId(body?.pokemonId)) return fail("Pokémon inválido.");
    if (!Array.isArray(body?.drops) || body.drops.length > MAX_DROPS_PER_POKEMON) return fail(`Lista de drops inválida (até ${MAX_DROPS_PER_POKEMON} por Pokémon).`);

    const seen = new Set<string>();
    const drops: { itemId: number; zone: string; min: number; max: number; chance: number | null; veryRare: boolean }[] = [];
    for (const [index, raw] of body.drops.entries()) {
      const label = `Drop ${index + 1}`;
      const d = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;

      const itemId = Number(d.itemId);
      if (!Number.isInteger(itemId) || itemId <= 0) return fail(`${label}: item inválido.`);
      if (!isZone(d.zone)) return fail(`${label}: zona inválida.`);
      const key = `${itemId}:${d.zone}`;
      if (seen.has(key)) return fail(`${label}: o mesmo item aparece duas vezes na zona ${d.zone}.`);
      seen.add(key);

      const min = Number(d.min);
      const max = d.max === null || d.max === undefined || d.max === "" ? min : Number(d.max);
      const okQty = (n: number) => Number.isInteger(n) && n >= 1 && n <= MAX_DROP_QUANTITY;
      if (!okQty(min) || !okQty(max)) return fail(`${label}: a quantidade deve ser um número inteiro de 1 a ${MAX_DROP_QUANTITY}.`);
      if (max < min) return fail(`${label}: a quantidade máxima não pode ser menor que a mínima.`);

      const veryRare = d.veryRare === true;
      let chance: number | null = null;
      if (d.chance !== null && d.chance !== undefined && d.chance !== "") {
        chance = Number(d.chance);
        if (!Number.isFinite(chance) || chance <= 0 || chance > 100) return fail(`${label}: a chance deve ser maior que 0 e no máximo 100.`);
        chance = Math.round(chance * 1000) / 1000;
      }
      if (veryRare && chance !== null) return fail(`${label}: use a chance em % OU “Muito raro”, não os dois.`);
      drops.push({ itemId, zone: d.zone, min, max, chance, veryRare });
    }

    const { error } = await createAdminClient().rpc("save_pokemon_drops", { p_pokemon_id: body.pokemonId, p_drops: drops });
    if (error) {
      if (error.code === "23503") return fail("O Pokémon ou algum item não existe mais. Recarregue a página e tente de novo.", 409);
      return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível salvar os drops.", 500);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Erro interno ao salvar os drops.", 500);
  }
}
