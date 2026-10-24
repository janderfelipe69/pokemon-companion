import { PageHeader } from "@/components/ui/PageHeader";
import { TiersExplorer } from "@/components/tiers/TiersExplorer";
import { getCatalog } from "@/lib/supabase/catalog";

export const metadata = { title: "Tiers e valores | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function TiersPage() {
  const { pokemon, tierPrices } = await getCatalog();

  return (
    <>
      <PageHeader
        title="Tiers e valores"
        description="Veja quanto vale cada tier, em KK e em reais, e encontre o tier e o valor de cada Pokémon."
      />
      <TiersExplorer pokemon={pokemon} tierPrices={tierPrices} />
    </>
  );
}
