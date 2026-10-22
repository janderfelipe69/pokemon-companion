import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PokedexBrowser } from "@/components/pokedex/PokedexBrowser";
import { buildPokedexEntries } from "@/lib/pokedex";
import { getCatalog } from "@/lib/supabase/catalog";

export const metadata = { title: "Pokédex | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function PokedexPage() {
  // Mesma fonte de Tiers e Valores: tier, preços e tipos ofensivos não são duplicados.
  const { pokemon, source } = await getCatalog();
  const entries = buildPokedexEntries(pokemon);

  return (
    <>
      <PageHeader
        title="Pokédex"
        description="Consulte cada Pokémon com a tipagem original e a tipagem ofensiva das skills."
        badge={<Badge tone="teal">{source === "supabase" ? "Banco de dados" : "Lista importada"}</Badge>}
      />
      <Card className="mb-6 flex items-start gap-4 border-teal/40 bg-teal/5">
        <Info className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
        <p className="text-sm text-muted">
          <strong className="font-medium text-fg">Tipos originais</strong> são os da espécie ou forma (dados do PokéAPI).{" "}
          <strong className="font-medium text-fg">Tipos ofensivos das skills</strong> são os cadastrados em Tiers e Valores.
          Os dois são independentes e podem ser diferentes.
        </p>
      </Card>
      <PokedexBrowser entries={entries} />
      <p className="mt-10 text-xs text-muted">
        Pokémon e os nomes dos personagens são marcas da Nintendo. Imagens: repositório PokeAPI/sprites (artes oficiais ©
        Nintendo, Game Freak e The Pokémon Company, usadas aqui sem fins comerciais). Tipagem original: PokéAPI. Projeto de
        fãs, sem vínculo oficial.
      </p>
    </>
  );
}
