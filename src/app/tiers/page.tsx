import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { TiersTabs } from "@/components/tiers/TiersTabs";
import { TiersBrowser } from "@/components/tiers/TiersBrowser";
import { getCatalog } from "@/lib/supabase/catalog";

export const metadata = { title: "Tiers e valores | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function TiersPage() {
  const { pokemon, source } = await getCatalog();
  const incomplete = pokemon.filter((p) => p.tier === null || p.listedType === null).length;

  return (
    <>
      <PageHeader
        title="Tiers e valores"
        description="Consulte os Pokémon organizados por tier."
        badge={<Badge tone="teal">{source === "supabase" ? "Banco de dados" : "Lista importada"}</Badge>}
      />
      <TiersTabs />
      <Card className="mb-6 flex items-start gap-4 border-teal/40 bg-teal/5">
        <Info className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
        <p className="text-sm text-muted">
          Dados {source === "supabase" ? "lidos do banco de dados" : "importados da lista original (arquivos do projeto)"}: {pokemon.length} registros, dos quais {incomplete} têm tier ou tipo
          não definido e precisam de revisão. Os preços estão na aba “Tabela de valores”.
        </p>
      </Card>
      <TiersBrowser pokemon={pokemon} />
    </>
  );
}
