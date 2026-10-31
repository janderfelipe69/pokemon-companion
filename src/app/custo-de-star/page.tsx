import { StarCalculator } from "@/components/star/StarCalculator";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Custo de Star | Pokémon Companion" };

export default function StarCostPage() {
  return (
    <>
      <PageHeader title="Custo de Star" description="Quanto custa subir as stars do seu Pokémon. Valores com 100% de sucesso, de 1 a 5 stars, já incluindo fabricar os pokes consumidos." />
      <StarCalculator />
    </>
  );
}
