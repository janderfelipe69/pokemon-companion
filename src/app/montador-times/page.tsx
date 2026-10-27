import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { TeamTools } from "@/components/team/TeamTools";
import { HUNT_TIERS, TEAM_PRESETS } from "@/config/teamPresets";
import { buildPokedexEntries } from "@/lib/pokedex";
import { isHuntableMega, isMega, isSealedDrop, megaName } from "@/lib/sealed";
import { getCatalog } from "@/lib/supabase/catalog";
import { getTeamPools } from "@/lib/supabase/teamPool";

export const metadata = { title: "Montador de times | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function Page() {
  // Mesma fonte da Pokédex: o montador só usa Pokémon cadastrados lá.
  const [{ pokemon: catalog, source }, pools] = await Promise.all([getCatalog(), getTeamPools()]);
  // O cadastro guarda "Absol" com a variante Mega: o nome mostrado precisa dizer "Mega Absol".
  const pokemon = catalog.map((p) => (isMega(p) ? { ...p, sourceName: megaName(p) } : p));
  const tiersInUse = new Set<string>([
    ...HUNT_TIERS,
    ...TEAM_PRESETS.flatMap((p) => [...p.tiers, ...(p.fallback ?? [])].map((t) => t.tier)),
  ]);
  // Envia ao navegador só os tiers que o montador realmente usa.
  // A Mega que é caça (Clefable) entra mesmo que o tier dela não esteja nas listas acima.
  const entries = buildPokedexEntries(pokemon.filter((p) => (p.tier && tiersInUse.has(p.tier)) || isHuntableMega(p)));
  // Megas que são DZ das caças Sealed, de qualquer tier, para a aba "Sealed".
  const sealed = buildPokedexEntries(pokemon.filter(isSealedDrop));

  return (
    <>
      <PageHeader
        title="Montador de times"
        description="Escolha o Pokémon que quer caçar e receba times de 6 que batem a efetividade, ou escolha um tipo e veja o que ele consegue farmar."
        badge={<Badge tone="teal">{source === "supabase" ? "Banco de dados" : "Lista importada"}</Badge>}
      />
      <TeamTools entries={entries} pools={pools} sealed={sealed} />
    </>
  );
}
