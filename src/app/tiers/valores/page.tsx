import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PricesBrowser } from "@/components/tiers/PricesBrowser";
import { TiersTabs } from "@/components/tiers/TiersTabs";
import { getCatalog } from "@/lib/supabase/catalog";
import { hasAnyPrice } from "@/lib/prices";

export const metadata = { title: "Tabela de valores | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function PricesPage() {
  const { pokemon, source } = await getCatalog();
  const priced = pokemon.filter(hasAnyPrice).length;
  return (
    <>
      <PageHeader
        title="Tiers e valores"
        description="Consulte os preços em KK (moeda do jogo) e em R$. Os dois valores são independentes."
        badge={<Badge tone="gold">Em desenvolvimento</Badge>}
      />
      <TiersTabs />
      <Card className="mb-6 flex items-start gap-4 border-gold/40 bg-gold/5">
        <Info className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
        <p className="text-sm text-muted">
          {priced === 0
            ? "Ainda não há preços cadastrados, por isso todos aparecem como “Não definido”. A lista original não traz preços e nenhum foi inventado. "
            : `${priced} Pokémon com algum preço cadastrado. Os demais aparecem como “Não definido”. `}
          Dados {source === "supabase" ? "lidos do banco de dados" : "dos arquivos do projeto"}. O cadastro e a edição pelo
          site ainda não existem: ficarão disponíveis para o administrador quando a área de administração for criada.
        </p>
      </Card>
      <PricesBrowser pokemon={pokemon} />
    </>
  );
}
