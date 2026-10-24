import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { MedalsBrowser } from "@/components/medals/MedalsBrowser";
import { MEDALS } from "@/data/medals";

export const metadata = { title: "Medalhas | Pokémon Companion" };

export default function MedalsPage() {
  return (
    <>
      <PageHeader
        title="Medalhas"
        description="Veja o que cada medalha dá, filtre por buff e monte sua seleção de 10 medalhas."
        badge={<Badge tone="teal">{MEDALS.length} medalhas</Badge>}
      />
      <MedalsBrowser />
      <p className="mt-10 text-xs text-muted">
        Pokémon e os nomes dos personagens são marcas da Nintendo. Imagens: repositório PokeAPI/sprites. Projeto de fãs, sem vínculo oficial.
      </p>
    </>
  );
}
