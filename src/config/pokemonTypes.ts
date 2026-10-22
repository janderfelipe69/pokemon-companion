import type { PokemonType } from "@/types/pokemon";

/** Nome em português e cor de cada tipo. Cores usadas só como identificação visual. */
export const typeInfo: Record<PokemonType, { label: string; color: string }> = {
  normal: { label: "Normal", color: "#a8a77a" },
  fire: { label: "Fogo", color: "#ee8130" },
  water: { label: "Água", color: "#6390f0" },
  electric: { label: "Elétrico", color: "#f7d02c" },
  grass: { label: "Planta", color: "#7ac74c" },
  ice: { label: "Gelo", color: "#96d9d6" },
  fighting: { label: "Lutador", color: "#c22e28" },
  poison: { label: "Venenoso", color: "#a33ea1" },
  ground: { label: "Terra", color: "#e2bf65" },
  flying: { label: "Voador", color: "#a98ff3" },
  psychic: { label: "Psíquico", color: "#f95587" },
  bug: { label: "Inseto", color: "#a6b91a" },
  rock: { label: "Pedra", color: "#b6a136" },
  ghost: { label: "Fantasma", color: "#735797" },
  dragon: { label: "Dragão", color: "#6f35fc" },
  dark: { label: "Sombrio", color: "#705746" },
  steel: { label: "Aço", color: "#b7b7ce" },
  fairy: { label: "Fada", color: "#d685ad" },
};
