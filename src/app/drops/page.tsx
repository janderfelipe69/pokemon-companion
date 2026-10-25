import { Badge } from "@/components/ui/Badge";
import { DropsHub } from "@/components/drops/DropsHub";
import { PageHeader } from "@/components/ui/PageHeader";
import { buildDropsClientData } from "@/lib/drops/build";
import { buildPokedexEntries } from "@/lib/pokedex";
import { getCatalog } from "@/lib/supabase/catalog";
import { getDropsRaw } from "@/lib/supabase/drops";
import { getTalents } from "@/lib/supabase/talents";

export const metadata = { title: "Drops de talentos | Pokémon Companion" };

/** Atualiza a página a cada 60 s. */
export const revalidate = 60;

export default async function DropsPage() {
  const [talents, raw, catalog] = await Promise.all([getTalents(), getDropsRaw(), getCatalog()]);
  const data = buildDropsClientData(buildPokedexEntries(catalog.pokemon), raw, { allItems: true });
  const totalTalents = talents.categories.reduce((sum, c) => sum + c.talents.length, 0);

  const talentsMessage =
    talents.status === "ok"
      ? null
      : talents.status === "unconfigured"
        ? "O banco de dados ainda não está configurado neste ambiente."
        : "Os talentos ainda não estão disponíveis. Se você é administrador, confirme que o arquivo supabase/migrations/0006_talents.sql foi executado no Supabase.";

  return (
    <>
      <PageHeader
        title="Drops de talentos"
        description="Veja os itens que você precisa entregar para liberar cada talento. Clique num item para descobrir quais Pokémon dropam ele."
        badge={totalTalents > 0 ? <Badge tone="teal">{totalTalents} talentos</Badge> : undefined}
      />
      <DropsHub categories={talents.categories} data={data} talentsMessage={talentsMessage} />
    </>
  );
}
