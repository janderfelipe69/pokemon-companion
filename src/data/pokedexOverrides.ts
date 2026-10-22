import type { PokedexOverride } from "@/types/pokedex";

/**
 * Ajustes manuais por ID de registro (o mesmo ID de Tiers e Valores, ex.: "shiny-blaziken").
 * Use para Pokémon customizados do servidor, ou para corrigir/completar a referência do PokéAPI:
 *   "lopuny": { originalTypes: ["normal"], imageUrl: "https://..." },
 * Um override tem prioridade sobre pokedexReference.ts. Atualmente vazio.
 */
export const pokedexOverrides: Record<string, PokedexOverride | undefined> = {};
