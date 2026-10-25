import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

/** Os 18 tipos (em inglês, como no jogo) que um membro pode escolher receber. */
export const BOOST_TYPES = Object.keys(typeInfo) as PokemonType[];

export const isBoostType = (value: unknown): value is PokemonType => typeof value === "string" && (BOOST_TYPES as string[]).includes(value);

/** Força de cada stone que cai no boss da guilda. O tipo vem junto: ex. "Advanced Fire" = +26 a +30 de Fire. */
export const STONE_TIERS = [
  { label: "Novice", min: 1, max: 5 },
  { label: "Elemental", min: 6, max: 10 },
  { label: "Common", min: 11, max: 15 },
  { label: "Enhanced", min: 16, max: 20 },
  { label: "Potent", min: 21, max: 25 },
  { label: "Advanced", min: 26, max: 30 },
] as const;

export const MAX_NICK_LENGTH = 40;
