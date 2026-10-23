/** Linha devolvida por GET /api/admin/pokemon. */
export type AdminRow = {
  id: string;
  name: string;
  variant: string | null;
  tier: string | null;
  listed_type: string | null;
  notes: string | null;
  price_kk: string | number | null;
  price_brl: string | number | null;
  pokedex_number: number | null;
  level: number | null;
  game_type: string | null;
  image_url: string | null;
  evolution: string | null;
  evolution_item: string | null;
  pokemon_defensive_types?: { type_code: string; position: number }[];
  pokemon_offensive_types?: { type_code: string; position: number }[];
  pokemon_pokelog?: { stage_1: number | null; stage_2: number | null; stage_3: number | null }[] | null;
};
