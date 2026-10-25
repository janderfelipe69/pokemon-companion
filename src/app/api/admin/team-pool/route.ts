import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { TEAM_PRESETS, WILDCARD_SPECIES } from "@/config/teamPresets";
import { buildPokedexEntries } from "@/lib/pokedex";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCatalog } from "@/lib/supabase/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SETUP_HINT = "A lista de Pokémon úteis ainda não existe no banco. Rode o arquivo supabase/migrations/0008_team_pool.sql no SQL Editor do Supabase e tente de novo.";
const unauthorized = () => NextResponse.json({ error: "Não autorizado." }, { status: 401 });
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

type DbError = { code?: string; message?: string };
const isSetupMissing = (e: DbError) => ["42P01", "42883", "PGRST205", "PGRST202"].includes(e.code ?? "") || /team_pool|save_team_pool/i.test(e.message ?? "");

const validId = (value: unknown): value is string => typeof value === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
const findPreset = (id: unknown) => TEAM_PRESETS.find((p) => p.curated && p.id === id);

/** Pokémon que podem entrar na lista (os dos tiers do tipo de time) e quais já estão nela: GET ?preset=economico */
export async function GET(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const preset = findPreset(new URL(request.url).searchParams.get("preset"));
    if (!preset) return fail("Tipo de time inválido.");

    const { data, error } = await createAdminClient().from("team_pool").select("pokemon_id").eq("preset_id", preset.id);
    if (error) return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível consultar a lista.", 500);

    const tiers = new Set<string>(preset.tiers.map((t) => t.tier));
    const { pokemon } = await getCatalog();
    const eligible = buildPokedexEntries(pokemon.filter((p) => p.tier && tiers.has(p.tier)))
      // O montador ignora quem não tem tipo ofensivo cadastrado (exceto coringas), então nem aparece aqui.
      .filter((e) => e.offensiveTypes.length > 0 || WILDCARD_SPECIES.includes(e.pokemon.name.toLowerCase()))
      .map((e) => ({
        id: e.pokemon.id,
        name: e.pokemon.sourceName ?? e.pokemon.name,
        tier: e.pokemon.tier as string,
        image: e.image?.src ?? null,
        dexNumber: e.dexNumber,
        offensiveTypes: e.offensiveTypes,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return NextResponse.json({
      preset: { id: preset.id, label: preset.label, tagline: preset.tagline, tiers: preset.tiers.map((t) => t.tier) },
      pokemon: eligible,
      poolIds: ((data ?? []) as { pokemon_id: string }[]).map((r) => r.pokemon_id),
    });
  } catch {
    return fail("Erro interno ao consultar a lista.", 500);
  }
}

/** Troca a lista de um tipo de time pela lista enviada (lista vazia = limpa e volta a usar todos os tiers). */
export async function POST(request: Request) {
  try {
    if (!(await isAdminAuthenticated())) return unauthorized();
    const body = (await request.json().catch(() => null)) as { preset?: unknown; pokemonIds?: unknown } | null;
    const preset = findPreset(body?.preset);
    if (!preset) return fail("Tipo de time inválido.");
    if (!Array.isArray(body?.pokemonIds) || body.pokemonIds.length > 3000 || !body.pokemonIds.every(validId)) return fail("Lista de Pokémon inválida.");

    const { error } = await createAdminClient().rpc("save_team_pool", { p_preset: preset.id, p_pokemon_ids: [...new Set(body.pokemonIds as string[])] });
    if (error) {
      if (error.code === "23503") return fail("Algum Pokémon não existe mais no catálogo. Recarregue a página e tente de novo.", 409);
      return fail(isSetupMissing(error) ? SETUP_HINT : "Não foi possível salvar a lista.", 500);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return fail("Erro interno ao salvar a lista.", 500);
  }
}
