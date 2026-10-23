
import { pokemonWithPrices } from "@/data/pokemon";
import { parsePrice } from "@/lib/money";
import { applyTierPrices } from "@/lib/prices";
import {
  POKEMON_TYPES,
  TIERS,
  type DecimalString,
  type Pokemon,
  type PokemonPrices,
  type PokemonType,
  type Tier,
} from "@/types/pokemon";
import { createPublicClient } from "./client";

export type CatalogSource = "supabase" | "static";
export type Catalog = { pokemon: Pokemon[]; source: CatalogSource };

export type PokemonRow = {
  id: string;
  name: string;
  variant: string | null;
  tier: string | null;
  listed_type: string | null;
  notes: string | null;
  price_kk: string | null;
  price_brl: string | null;
  source_name: string | null;
  source_tier_raw: string | null;
  source_type_raw: string | null;
  source_line: number | null;
  pokemon_defensive_types: { type_code: string; position: number }[] | null;
  pokemon_offensive_types: { type_code: string; position: number }[] | null;
};

type TierPriceRow = {
  tier_code: string;
  price_kk: string | null;
  price_brl: string | null;
};

const SELECT = [
  "id", "name", "variant", "tier", "listed_type", "notes",
  "price_kk::text", "price_brl::text",
  "source_name", "source_tier_raw", "source_type_raw", "source_line",
  "pokemon_defensive_types(type_code, position)",
  "pokemon_offensive_types(type_code, position)",
].join(", ");

const PAGE_SIZE = 1000;

function toTypes(rows: PokemonRow["pokemon_defensive_types"]): PokemonType[] {
  return [...(rows ?? [])]
    .sort((a, b) => a.position - b.position)
    .flatMap((r) => POKEMON_TYPES.find((t) => t === r.type_code) ?? []);
}

function toPrice(
  value: string | null,
  currency: "kk" | "brl",
): DecimalString | null {
  const result = parsePrice(value, currency);
  return result.ok ? result.value : null;
}

export function mapRowToPokemon(row: PokemonRow): Pokemon {
  return {
    id: row.id,
    name: row.name,
    ...(row.variant ? { variant: row.variant } : {}),
    defensiveTypes: toTypes(row.pokemon_defensive_types),
    offensiveTypes: toTypes(row.pokemon_offensive_types),
    tier: TIERS.find((t) => t === row.tier) ?? null,
    listedType: POKEMON_TYPES.find((t) => t === row.listed_type) ?? null,
    ...(row.notes ? { notes: row.notes } : {}),
    ...(row.source_name ? { sourceName: row.source_name } : {}),
    ...(row.source_line != null
      ? {
          source: {
            line: row.source_line,
            tier: row.source_tier_raw ?? "",
            type: row.source_type_raw ?? "",
          },
        }
      : {}),
    priceKk: toPrice(row.price_kk, "kk"),
    priceBrl: toPrice(row.price_brl, "brl"),
  };
}

function mapTierPrices(rows: TierPriceRow[]): Partial<Record<Tier, PokemonPrices>> {
  const result: Partial<Record<Tier, PokemonPrices>> = {};

  for (const row of rows) {
    const tier = TIERS.find((item) => item === row.tier_code);
    if (!tier) continue;

    result[tier] = {
      kk: toPrice(row.price_kk, "kk"),
      brl: toPrice(row.price_brl, "brl"),
    };
  }

  return result;
}

const staticCatalog = (): Catalog => ({
  pokemon: pokemonWithPrices,
  source: "static",
});

export async function getCatalog(): Promise<Catalog> {
  const client = createPublicClient();
  if (!client) return staticCatalog();

  try {
    const rows: PokemonRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await client
        .from("pokemon")
        .select(SELECT)
        .order("source_line", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) throw new Error(error.message);

      const page = (data ?? []) as unknown as PokemonRow[];
      rows.push(...page);

      if (page.length < PAGE_SIZE) break;
    }

    if (rows.length === 0) {
      console.warn("[catalog] Tabela 'pokemon' vazia: usando os arquivos do projeto.");
      return staticCatalog();
    }

    const pokemon = rows.map(mapRowToPokemon);

    const { data: tierRows, error: tierError } = await client
      .from("tier_prices")
      .select("tier_code, price_kk::text, price_brl::text");

    if (tierError) {
      // A tabela pode ainda não ter sido criada. O catálogo continua funcionando.
      console.warn("[catalog] Não foi possível carregar os preços por tier.");
      return { pokemon, source: "supabase" };
    }

    const tierPrices = mapTierPrices((tierRows ?? []) as TierPriceRow[]);

    return {
      pokemon: applyTierPrices(pokemon, tierPrices),
      source: "supabase",
    };
  } catch (error) {
    console.warn("[catalog] Falha ao ler o Supabase; usando os arquivos do projeto.", error);
    return staticCatalog();
  }
}
