import type { Pokemon, PokemonType } from "./pokemon";

/** Dados de referência de uma espécie/forma (gerados a partir do PokéAPI). */
export type SpeciesRef = {
  /** ID da forma no PokéAPI (formas especiais usam IDs acima de 10000). */
  pokeapiId: number;
  /** Número na Pokédex nacional. */
  dexNumber: number;
  /** Tipagem original da forma, na ordem dos slots. */
  types: PokemonType[];
  /** Caminho relativo em PokeAPI/sprites (`sprites/pokemon/...`); `null` = sem imagem confirmada. */
  images: { normal: string | null; shiny: string | null };
};

/** Ajustes manuais por ID de registro (ex.: Pokémon customizado do servidor). */
export type PokedexOverride = {
  originalTypes?: PokemonType[];
  /** URL https completa da imagem. */
  imageUrl?: string;
};

export type PokedexImageKind = "official-artwork" | "showdown" | "custom";

export type PokedexEntry = {
  /** Registro compartilhado com Tiers e Valores (tier, preços, tipo ofensivo, etc.). */
  pokemon: Pokemon;
  /** Chave da forma na referência (ID do registro sem o prefixo "shiny-"). */
  formKey: string;
  dexNumber: number | null;
  /** `null` = tipagem original indisponível (nunca deduzida). */
  originalTypes: PokemonType[] | null;
  /** Tipos ofensivos das skills, vindos do registro de Tiers e Valores. */
  offensiveTypes: PokemonType[];
  image: { src: string; kind: PokedexImageKind } | null;
};
