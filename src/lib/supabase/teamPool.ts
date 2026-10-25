import { createPublicClient } from "./client";

/** Lista de Pokémon úteis de cada tipo de time: `{ economico: ["pidgey", ...] }`. Sem banco ou sem a tabela, devolve `{}`. */
export async function getTeamPools(): Promise<Record<string, string[]>> {
  const client = createPublicClient();
  if (!client) return {};
  try {
    const { data, error } = await client.from("team_pool").select("preset_id, pokemon_id").order("pokemon_id", { ascending: true });
    if (error) throw new Error(error.message);
    const pools: Record<string, string[]> = {};
    for (const row of (data ?? []) as { preset_id: string; pokemon_id: string }[]) (pools[row.preset_id] ??= []).push(row.pokemon_id);
    return pools;
  } catch (error) {
    console.warn("[team-pool] Não foi possível ler a lista de Pokémon úteis.", error);
    return {};
  }
}
