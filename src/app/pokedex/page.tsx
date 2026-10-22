import { Info } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { PokedexBrowser } from "@/components/pokedex/PokedexBrowser";
import { demoPokemon } from "@/data/demoPokemon";

export const metadata = { title: "Pokédex | Pokémon Companion" };

export default function PokedexPage() {
  return (
    <>
      <PageHeader
        title="Pokédex"
        description="Consulte os Pokémon, seus tipos defensivos e ofensivos."
        badge={<Badge tone="teal">Dados de demonstração</Badge>}
      />
      <Card className="mb-6 flex items-start gap-4 border-teal/40 bg-teal/5">
        <Info className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
        <p className="text-sm text-muted">
          Os Pokémon abaixo são fictícios e servem apenas para demonstrar a listagem, a busca e os filtros.
          Não representam informações do jogo.
        </p>
      </Card>
      <PokedexBrowser pokemon={demoPokemon} />
    </>
  );
}
