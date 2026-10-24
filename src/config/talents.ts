import type { PokemonType } from "@/types/pokemon";
import { typeInfo } from "@/config/pokemonTypes";

/** Categorias da janela de talentos do jogo, na mesma ordem. `type` = tipo de Pokémon (para o ícone). */
export type TalentCategory = { key: string; label: string; type?: PokemonType };

export const TALENT_CATEGORIES: readonly TalentCategory[] = [
  { key: "character", label: "Personagem" },
  { key: "pokemon", label: "Pokémon" },
  { key: "bug", label: "Inseto", type: "bug" },
  { key: "dark", label: "Sombrio", type: "dark" },
  { key: "dragon", label: "Dragão", type: "dragon" },
  { key: "electric", label: "Elétrico", type: "electric" },
  { key: "fairy", label: "Fada", type: "fairy" },
  { key: "fighting", label: "Lutador", type: "fighting" },
  { key: "fire", label: "Fogo", type: "fire" },
  { key: "flying", label: "Voador", type: "flying" },
  { key: "ghost", label: "Fantasma", type: "ghost" },
  { key: "grass", label: "Planta", type: "grass" },
  { key: "ground", label: "Terrestre", type: "ground" },
  { key: "ice", label: "Gelo", type: "ice" },
  { key: "normal", label: "Normal", type: "normal" },
  { key: "poison", label: "Venenoso", type: "poison" },
  { key: "psychic", label: "Psíquico", type: "psychic" },
  { key: "rock", label: "Pedra", type: "rock" },
  { key: "steel", label: "Aço", type: "steel" },
  { key: "water", label: "Água", type: "water" },
];

export const isTalentCategory = (key: string) => TALENT_CATEGORIES.some((c) => c.key === key);

/** Até quantos itens diferentes um talento pede. */
export const MAX_TALENT_ITEMS = 6;
export const MAX_ITEM_QUANTITY = 999_999;
export const MAX_TALENT_TEXT = 200;

/**
 * Os 4 bônus que se repetem em todo tipo (a % é a mesma; só os itens mudam).
 * O texto é o do jogo, em inglês, com o nome do tipo.
 */
export function standardBonuses(type: PokemonType): string[] {
  const name = typeInfo[type].label;
  return [
    `Increases all ${name} Type spells damage by 3%.`,
    `Increases all ${name} Type spells damage by 5%.`,
    `Increases the defense of ${name} Type Pokémon by 3%.`,
    `Increases the defense of ${name} Type Pokémon by 5%.`,
  ];
}
