import type { PokemonType } from "@/types/pokemon";

/** Nome (em inglês, como no jogo) e cor de cada tipo. Cores usadas só como identificação visual. */
export const typeInfo: Record<PokemonType, { label: string; color: string }> = {
  normal: { label: "Normal", color: "#a8a77a" },
  fire: { label: "Fire", color: "#ee8130" },
  water: { label: "Water", color: "#6390f0" },
  electric: { label: "Electric", color: "#f7d02c" },
  grass: { label: "Grass", color: "#7ac74c" },
  ice: { label: "Ice", color: "#96d9d6" },
  fighting: { label: "Fighting", color: "#c22e28" },
  poison: { label: "Poison", color: "#a33ea1" },
  ground: { label: "Ground", color: "#e2bf65" },
  flying: { label: "Flying", color: "#a98ff3" },
  psychic: { label: "Psychic", color: "#f95587" },
  bug: { label: "Bug", color: "#a6b91a" },
  rock: { label: "Rock", color: "#b6a136" },
  ghost: { label: "Ghost", color: "#735797" },
  dragon: { label: "Dragon", color: "#6f35fc" },
  dark: { label: "Dark", color: "#705746" },
  steel: { label: "Steel", color: "#b7b7ce" },
  fairy: { label: "Fairy", color: "#d685ad" },
};
