import type { PokemonType } from "@/types/pokemon";

/**
 * Tabela de tipos (Geração 6+, com Fada). Para cada tipo ATACANTE, lista os tipos
 * DEFENSORES que recebem dano dobrado, reduzido ou nenhum dano.
 */
export const TYPE_CHART: Record<PokemonType, { double: PokemonType[]; half: PokemonType[]; zero: PokemonType[] }> = {
  normal: { double: [], half: ["rock", "steel"], zero: ["ghost"] },
  fire: { double: ["grass", "ice", "bug", "steel"], half: ["fire", "water", "rock", "dragon"], zero: [] },
  water: { double: ["fire", "ground", "rock"], half: ["water", "grass", "dragon"], zero: [] },
  electric: { double: ["water", "flying"], half: ["electric", "grass", "dragon"], zero: ["ground"] },
  grass: { double: ["water", "ground", "rock"], half: ["fire", "grass", "poison", "flying", "bug", "dragon", "steel"], zero: [] },
  ice: { double: ["grass", "ground", "flying", "dragon"], half: ["fire", "water", "ice", "steel"], zero: [] },
  fighting: { double: ["normal", "ice", "rock", "dark", "steel"], half: ["poison", "flying", "psychic", "bug", "fairy"], zero: ["ghost"] },
  poison: { double: ["grass", "fairy"], half: ["poison", "ground", "rock", "ghost"], zero: ["steel"] },
  ground: { double: ["fire", "electric", "poison", "rock", "steel"], half: ["grass", "bug"], zero: ["flying"] },
  flying: { double: ["grass", "fighting", "bug"], half: ["electric", "rock", "steel"], zero: [] },
  psychic: { double: ["fighting", "poison"], half: ["psychic", "steel"], zero: ["dark"] },
  bug: { double: ["grass", "psychic", "dark"], half: ["fire", "fighting", "poison", "flying", "ghost", "steel", "fairy"], zero: [] },
  rock: { double: ["fire", "ice", "flying", "bug"], half: ["fighting", "ground", "steel"], zero: [] },
  ghost: { double: ["psychic", "ghost"], half: ["dark"], zero: ["normal"] },
  dragon: { double: ["dragon"], half: ["steel"], zero: ["fairy"] },
  dark: { double: ["psychic", "ghost"], half: ["fighting", "dark", "fairy"], zero: [] },
  steel: { double: ["ice", "rock", "fairy"], half: ["fire", "water", "electric", "steel"], zero: [] },
  fairy: { double: ["fighting", "dragon", "dark"], half: ["fire", "poison", "steel"], zero: [] },
};
