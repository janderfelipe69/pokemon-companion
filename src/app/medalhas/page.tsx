import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { MedalsBrowser } from "@/components/medals/MedalsBrowser";
import { getMedals } from "@/lib/supabase/medals";

export const metadata = { title: "Medalhas | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function MedalsPage() {
  const { medals } = await getMedals();

  return (
    <>
      <PageHeader
        title="Medalhas"
        description="Veja o que cada medalha dá, filtre por buff (da maior % para a menor) e monte sua seleção de 10 medalhas."
        badge={<Badge tone="teal">{medals.length} medalhas</Badge>}
      />
      <MedalsBrowser medals={medals} />
      <p className="mt-10 text-xs text-muted">
        Pokémon e os nomes dos personagens são marcas da Nintendo. Imagens: repositório PokeAPI/sprites. Projeto de fãs, sem vínculo oficial.
      </p>
    </>
  );
}
