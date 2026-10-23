import type { PokemonType } from "./pokemon";

/**
 * Uma forma na Pokédex global (referência completa, vinda do PokéAPI).
 * É só a fonte de consulta: o que o site publica é o catálogo do administrador.
 */
export type GlobalDexEntry = {
  /** ID que o registro terá no catálogo (versão normal): "abra", "mega-clefable", "alolan-vulpix". */
  id: string;
  /** Nome gravado no catálogo, sem o prefixo da variante: "Abra", "Clefable", "Vulpix". */
  name: string;
  /** "Mega", "Alolan", "Galarian", "Hisuian", "Paldean", "Primal" ou `null` (forma normal). Shiny é escolhido ao cadastrar. */
  variant: string | null;
  /** Número na Pokédex nacional. */
  dex: number;
  /** ID da forma no PokéAPI (usado para montar a URL da imagem). */
  pokeapiId: number;
  /** Tipagem original da forma. */
  types: PokemonType[];
  /** Nome de quem evolui para este Pokémon. `undefined` = dado indisponível. */
  evolvesFrom?: string | null;
  /** Nomes das próximas evoluções. `undefined` = dado indisponível (lista parcial); `[]` = não evolui. */
  evolvesTo?: string[];
  /** Caminhos de imagem já conhecidos (lista parcial). Sem isto, usa-se o official-artwork pelo `pokeapiId`. */
  images?: { normal: string | null; shiny: string | null };
};
