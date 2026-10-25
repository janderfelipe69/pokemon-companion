import type { PokedexEntry } from "@/types/pokedex";
import type { RawDrops } from "@/lib/supabase/drops";
import type { DropPokemon, DropsClientData } from "./types";

/**
 * Junta os drops do banco com os dados da Pokédex (nome e imagem de cada Pokémon).
 * `allItems`: manda todos os itens (página Drops, que também lista itens sem Pokémon) ou só os que têm drop.
 */
export function buildDropsClientData(entries: PokedexEntry[], raw: RawDrops, options: { allItems: boolean }): DropsClientData {
  const entryById = new Map(entries.map((e) => [e.pokemon.id, e]));

  // Drops de Pokémon que não estão mais no catálogo são ignorados.
  const drops = raw.drops.filter((d) => entryById.has(d.pokemonId));

  const pokemon: DropPokemon[] = [...new Set(drops.map((d) => d.pokemonId))].flatMap((id) => {
    const entry = entryById.get(id);
    return entry
      ? [{ id, name: entry.pokemon.sourceName ?? entry.pokemon.name, image: entry.image?.src ?? null, dexNumber: entry.dexNumber }]
      : [];
  });

  const usedItems = new Set(drops.map((d) => d.itemId));
  return { items: options.allItems ? raw.items : raw.items.filter((i) => usedItems.has(i.id)), pokemon, drops };
}
