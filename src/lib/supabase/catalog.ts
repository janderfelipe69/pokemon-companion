
import { pokemonWithPrices } from "@/data/pokemon";
import { parsePrice } from "@/lib/money";
import { applyTierPrices } from "@/lib/prices";
import {
  POKEMON_TYPES,
  TIERS,
  type DecimalString,
  type Pokemon,
  type PokemonType,
  type Tier,
  type TierPriceRanges,
} from "@/types/pokemon";
import { createPublicClient } from "./client";

export type CatalogSource = "supabase" | "static";
export type TierPriceMap = Partial<Record<Tier, TierPriceRanges>>;
export type Catalog = { pokemon: Pokemon[]; source: CatalogSource; tierPrices: TierPriceMap };

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
  pokedex_number: number | null;
  image_url: string | null;
  evolution: string | null;
  evolution_item: string | null;
  pokemon_defensive_types: { type_code: string; position: number }[] | null;
  pokemon_offensive_types: { type_code: string; position: number }[] | null;
};

type TierPriceRow = {
  tier_code: string;
  price_kk: string | null;
  price_kk_max?: string | null;
  price_brl: string | null;
  price_brl_max?: string | null;
};

const TIER_SELECT = "tier_code, price_kk::text, price_kk_max::text, price_brl::text, price_brl_max::text";
/** Banco ainda sem a migração 0004 (sem colunas de máximo): continua funcionando só com o mínimo. */
const TIER_SELECT_LEGACY = "tier_code, price_kk::text, price_brl::text";

const SELECT = [
  "id", "name", "variant", "tier", "listed_type", "notes",
  "price_kk::text", "price_brl::text",
  "source_name", "source_tier_raw", "source_type_raw", "source_line",
  "pokedex_number", "image_url", "evolution", "evolution_item",
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
    ...(row.pokedex_number != null ? { pokedexNumber: row.pokedex_number } : {}),
    ...(row.image_url ? { imageUrl: row.image_url } : {}),
    ...(row.evolution ? { evolution: row.evolution } : {}),
    ...(row.evolution_item ? { evolutionItem: row.evolution_item } : {}),
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

function toRange(min: string | null | undefined, max: string | null | undefined, currency: "kk" | "brl") {
  const low = toPrice(min ?? null, currency);
  // Máximo sem mínimo não faz sentido: ignora.
  return { min: low, max: low == null ? null : toPrice(max ?? null, currency) };
}

function mapTierPrices(rows: TierPriceRow[]): TierPriceMap {
  const result: TierPriceMap = {};

  for (const row of rows) {
    const tier = TIERS.find((item) => item === row.tier_code);
    if (!tier) continue;

    result[tier] = {
      kk: toRange(row.price_kk, row.price_kk_max, "kk"),
      brl: toRange(row.price_brl, row.price_brl_max, "brl"),
    };
  }

  return result;
}

const staticCatalog = (): Catalog => ({
  pokemon: pokemonWithPrices,
  source: "static",
  tierPrices: {},
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

    let { data: tierRows, error: tierError } = await client.from("tier_prices").select(TIER_SELECT);
    if (tierError) {
      ({ data: tierRows, error: tierError } = await client.from("tier_prices").select(TIER_SELECT_LEGACY));
    }

    if (tierError) {
      // A tabela pode ainda não ter sido criada. O catálogo continua funcionando.
      console.warn("[catalog] Não foi possível carregar os preços por tier.");
      return { pokemon, source: "supabase", tierPrices: {} };
    }

    const tierPrices = mapTierPrices((tierRows ?? []) as TierPriceRow[]);

    return {
      pokemon: applyTierPrices(pokemon, tierPrices),
      source: "supabase",
      tierPrices,
    };
  } catch (error) {
    console.warn("[catalog] Falha ao ler o Supabase; usando os arquivos do projeto.", error);
    return staticCatalog();
  }
}
