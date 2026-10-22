import type { Pokemon, PokemonType } from "@/types/pokemon";

export type PokemonFilters = {
  query: string;
  defensiveType: PokemonType | "";
  offensiveType: PokemonType | "";
};

/** Remove acentos e ignora maiúsculas, para que "faiscao" encontre "Faiscão". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

export function filterPokemon(list: Pokemon[], { query, defensiveType, offensiveType }: PokemonFilters): Pokemon[] {
  const q = normalize(query);
  return list.filter((p) => {
    if (q && !normalize(p.name).includes(q)) return false;
    if (defensiveType && !p.defensiveTypes.includes(defensiveType)) return false;
    if (offensiveType && !p.offensiveTypes.includes(offensiveType)) return false;
    return true;
  });
}
