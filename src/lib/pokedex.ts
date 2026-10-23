import { spriteUrl } from "@/config/images";
import { pokedexOverrides } from "@/data/pokedexOverrides";
import { pokedexReference } from "@/data/pokedexReference";
import type { PokedexEntry } from "@/types/pokedex";
import type { Pokemon, PokemonType } from "@/types/pokemon";

/** Chave da forma na referência: ID do registro sem o prefixo "shiny-" (associação exata, sem comparar nomes). */
export const formKeyOf = (p: Pokemon): string =>
  p.variant === "Shiny" && p.id.startsWith("shiny-") ? p.id.slice("shiny-".length) : p.id;

/**
 * Tipos ofensivos das skills. Vêm sempre do registro de Tiers e Valores (`listedType`,
 * ou `offensiveTypes` se o banco tiver vários). Nunca são deduzidos da tipagem original.
 */
export function skillTypesOf(p: Pokemon): PokemonType[] {
  if (p.offensiveTypes.length > 0) return p.offensiveTypes;
  return p.listedType ? [p.listedType] : [];
}

export function buildPokedexEntry(p: Pokemon): PokedexEntry {
  const formKey = formKeyOf(p);
  const ref = pokedexReference[formKey];
  const override = pokedexOverrides[p.id];

  const imagePath = ref?.images[p.variant === "Shiny" ? "shiny" : "normal"] ?? null;
  const image = override?.imageUrl
    ? { src: override.imageUrl, kind: "custom" as const }
    : imagePath
      ? { src: spriteUrl(imagePath), kind: imagePath.includes("showdown") ? ("showdown" as const) : ("official-artwork" as const) }
      : p.imageUrl
        ? { src: p.imageUrl, kind: "custom" as const } // cadastrado pelo administrador (Pokémon fora da referência)
        : null;

  return {
    pokemon: p,
    formKey,
    dexNumber: ref?.dexNumber ?? p.pokedexNumber ?? null,
    originalTypes: override?.originalTypes ?? ref?.types ?? (p.defensiveTypes.length > 0 ? p.defensiveTypes : null),
    offensiveTypes: skillTypesOf(p),
    image,
  };
}

export const buildPokedexEntries = (list: Pokemon[]): PokedexEntry[] => list.map(buildPokedexEntry);
