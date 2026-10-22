import { applyPrices } from "@/lib/prices";
import { initialPrices } from "./prices";
import { parsePokemonList } from "@/lib/importPokemon";
import { rawPokemonList } from "./pokemonSource";

const result = parsePokemonList(rawPokemonList);

/** Pokémon importados da lista original (ver `pokemonSource.ts`). */
export const pokemonList = result.pokemon;
/** Linhas que precisam de revisão. */
export const importIssues = result.issues;

/** Pokémon importados com os preços cadastrados em `prices.ts`. */
export const pokemonWithPrices = applyPrices(pokemonList, initialPrices);
