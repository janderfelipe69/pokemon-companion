import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TeamBuilder } from "@/components/team/TeamBuilder";
import { HUNT_TIERS, TEAM_PRESETS } from "@/config/teamPresets";
import { buildPokedexEntries } from "@/lib/pokedex";
import { getCatalog } from "@/lib/supabase/catalog";
import { getTeamPools } from "@/lib/supabase/teamPool";

export const metadata = { title: "Montador de times | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function Page() {
  // Mesma fonte da Pokédex: o montador só usa Pokémon cadastrados lá.
  const [{ pokemon, source }, pools] = await Promise.all([getCatalog(), getTeamPools()]);
  const tiersInUse = new Set<string>([
    ...HUNT_TIERS,
    ...TEAM_PRESETS.flatMap((p) => [...p.tiers, ...(p.fallback ?? [])].map((t) => t.tier)),
  ]);
  // Envia ao navegador só os tiers que o montador realmente usa.
  const entries = buildPokedexEntries(pokemon.filter((p) => p.tier && tiersInUse.has(p.tier)));

  return (
    <>
      <PageHeader
        title="Montador de times"
        description="Escolha o Pokémon que quer caçar e receba times de 6 que batem a efetividade, de acordo com o seu orçamento."
        badge={<Badge tone="teal">{source === "supabase" ? "Banco de dados" : "Lista importada"}</Badge>}
      />
      <TeamBuilder entries={entries} pools={pools} />
    </>
  );
}
