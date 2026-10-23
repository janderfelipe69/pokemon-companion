import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  POKEMON_TYPES,
  TIERS,
  type PokemonType,
  type Tier,
} from "@/types/pokemon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PokemonInput = {
  id?: unknown;
  name?: unknown;
  variant?: unknown;
  tier?: unknown;
  listedType?: unknown;
  defensiveTypes?: unknown;
  offensiveTypes?: unknown;
  notes?: unknown;
  priceKk?: unknown;
  priceBrl?: unknown;
  pokedexNumber?: unknown;
  level?: unknown;
  gameType?: unknown;
  imageUrl?: unknown;
  evolution?: unknown;
  evolutionItem?: unknown;
  pokelogStages?: unknown;
};

function parsePrice(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }

  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(text)) return undefined;

  const number = Number(text);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function parseTypes(value: unknown): PokemonType[] | null {
  if (!Array.isArray(value)) return null;

  const types = value.filter(
    (item): item is PokemonType =>
      typeof item === "string" &&
      POKEMON_TYPES.some((type) => type === item),
  );

  if (types.length !== value.length || new Set(types).size !== types.length) {
    return null;
  }

  return types;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}

function optionalText(
  value: unknown,
  maxLength = 500,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    return undefined;
  }

  return value.trim() || null;
}

function optionalInteger(
  value: unknown,
  minimum = 0,
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;

  const number = Number(value);
  if (!Number.isInteger(number) || number < minimum) return undefined;

  return number;
}

async function authorized() {
  return await isAdminAuthenticated();
}

export async function GET() {
  try {
    if (!(await authorized())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pokemon")
      .select(
        "id, name, variant, tier, listed_type, notes, price_kk, price_brl, pokedex_number, level, game_type, image_url, evolution, evolution_item, pokemon_defensive_types(type_code, position), pokemon_offensive_types(type_code, position), pokemon_pokelog(stage_1, stage_2, stage_3)",
      )
      .order("name");

    if (error) {
      console.error("[admin/pokemon] Falha ao listar Pokémon.");
      return NextResponse.json(
        { error: "Não foi possível carregar os Pokémon." },
        { status: 500 },
      );
    }

    return NextResponse.json({ pokemon: data ?? [] });
  } catch {
    return NextResponse.json(
      { error: "Erro interno ao listar Pokémon." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await authorized())) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const body = (await request.json()) as PokemonInput;

    if (
      !validId(body.id) ||
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 120 ||
      (body.variant !== undefined &&
        body.variant !== null &&
        (typeof body.variant !== "string" || body.variant.length > 120)) ||
      (body.notes !== undefined &&
        body.notes !== null &&
        (typeof body.notes !== "string" || body.notes.length > 500)) ||
      (body.tier != null && !TIERS.some((tier) => tier === body.tier)) ||
      (body.listedType != null &&
        !POKEMON_TYPES.some((type) => type === body.listedType))
    ) {
      return NextResponse.json(
        { error: "Confira o identificador, nome, tier e tipo." },
        { status: 400 },
      );
    }

    const defensiveTypes = parseTypes(body.defensiveTypes ?? []);
    const offensiveTypes = parseTypes(body.offensiveTypes ?? []);
    const priceKk = parsePrice(body.priceKk);
    const priceBrl = parsePrice(body.priceBrl);
    const pokedexNumber = optionalInteger(body.pokedexNumber, 1);
    const level = optionalInteger(body.level, 0);
    const gameType = optionalText(body.gameType, 120);
    const imageUrl = optionalText(body.imageUrl, 2000);
    const evolution = optionalText(body.evolution, 200);
    const evolutionItem = optionalText(body.evolutionItem, 200);

    // Os helpers devolvem `undefined` tanto para "campo não enviado" (válido, opcional)
    // quanto para "valor inválido". Só é erro quando o campo veio no corpo e não foi aceito.
    const rejected = (raw: unknown, parsed: unknown) =>
      raw !== undefined && parsed === undefined;

    if (body.tier == null) {
      return NextResponse.json(
        { error: "Escolha o tier do Pokémon." },
        { status: 400 },
      );
    }

    if (!offensiveTypes || offensiveTypes.length < 1) {
      return NextResponse.json(
        { error: "Escolha pelo menos 1 tipo ofensivo (máximo 2)." },
        { status: 400 },
      );
    }

    if (
      !defensiveTypes ||
      defensiveTypes.length > 2 ||
      offensiveTypes.length > 2 ||
      priceKk === undefined ||
      priceBrl === undefined ||
      rejected(body.pokedexNumber, pokedexNumber) ||
      rejected(body.level, level) ||
      rejected(body.gameType, gameType) ||
      rejected(body.imageUrl, imageUrl) ||
      rejected(body.evolution, evolution) ||
      rejected(body.evolutionItem, evolutionItem) ||
      (typeof imageUrl === "string" && !/^https:\/\/\S+$/i.test(imageUrl))
    ) {
      return NextResponse.json(
        { error: "Confira as tipagens, preços e dados adicionais." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const pokemonData: Record<string, unknown> = {
      id: body.id,
      name: body.name.trim(),
      variant: typeof body.variant === "string" ? body.variant.trim() || null : null,
      tier: (body.tier ?? null) as Tier | null,
      listed_type: (body.listedType ?? null) as PokemonType | null,
      notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
      price_kk: priceKk,
      price_brl: priceBrl,
    };

    if (pokedexNumber !== undefined) pokemonData.pokedex_number = pokedexNumber;
    if (level !== undefined) pokemonData.level = level;
    if (gameType !== undefined) pokemonData.game_type = gameType;
    if (imageUrl !== undefined) pokemonData.image_url = imageUrl;
    if (evolution !== undefined) pokemonData.evolution = evolution;
    if (evolutionItem !== undefined) pokemonData.evolution_item = evolutionItem;

    const { error: pokemonError } = await supabase
      .from("pokemon")
      .upsert(pokemonData, { onConflict: "id" });

    if (pokemonError) {
      console.error("[admin/pokemon] Falha ao salvar Pokémon.");
      return NextResponse.json(
        { error: "Não foi possível salvar o Pokémon." },
        { status: 500 },
      );
    }

    for (const [table, types] of [
      ["pokemon_defensive_types", defensiveTypes],
      ["pokemon_offensive_types", offensiveTypes],
    ] as const) {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq("pokemon_id", body.id);

      if (deleteError) {
        return NextResponse.json(
          { error: "Pokémon salvo, mas não foi possível atualizar as tipagens." },
          { status: 500 },
        );
      }

      if (types.length > 0) {
        const { error: insertError } = await supabase.from(table).insert(
          types.map((type, position) => ({
            pokemon_id: body.id as string,
            type_code: type,
            position,
          })),
        );

        if (insertError) {
          return NextResponse.json(
            { error: "Pokémon salvo, mas não foi possível gravar as tipagens." },
            { status: 500 },
          );
        }
      }
    }

    if (body.pokelogStages !== undefined) {
      if (
        !Array.isArray(body.pokelogStages) ||
        body.pokelogStages.length !== 3
      ) {
        return NextResponse.json(
          { error: "O Pokélog precisa ter exatamente três etapas." },
          { status: 400 },
        );
      }

      const stages = body.pokelogStages.map((value) =>
        optionalInteger(value, 0),
      );

      if (stages.some((value) => value === undefined)) {
        return NextResponse.json(
          { error: "As etapas do Pokélog devem ser números inteiros positivos ou vazios." },
          { status: 400 },
        );
      }

      const { error: pokelogError } = await supabase
        .from("pokemon_pokelog")
        .upsert(
          {
            pokemon_id: body.id,
            stage_1: stages[0] ?? null,
            stage_2: stages[1] ?? null,
            stage_3: stages[2] ?? null,
          },
          { onConflict: "pokemon_id" },
        );

      if (pokelogError) {
        return NextResponse.json(
          { error: "Pokémon salvo, mas não foi possível gravar o Pokélog." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Dados inválidos ou erro interno ao salvar Pokémon." },
      { status: 400 },
    );
  }
}