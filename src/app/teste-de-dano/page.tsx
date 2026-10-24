import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { DamageTest } from "@/components/dano/DamageTest";
import { buildPokedexEntries } from "@/lib/pokedex";
import { compareByName, tierKeyOf } from "@/lib/tierFilters";
import { getCatalog } from "@/lib/supabase/catalog";
import type { DexOption } from "@/lib/damageTest/search";

export const metadata = { title: "Teste de dano | Pokémon Companion" };

/** Atualiza a página a cada 60 s quando os dados vêm do Supabase. */
export const revalidate = 60;

export default async function Page() {
  // Mesma fonte da Pokédex: só dá para escolher Pokémon cadastrados lá.
  const { pokemon, source } = await getCatalog();
  const options: DexOption[] = buildPokedexEntries([...pokemon].sort(compareByName)).map((e) => ({
    id: e.pokemon.id,
    name: e.pokemon.sourceName ?? e.pokemon.name,
    tier: tierKeyOf(e.pokemon),
    image: e.image?.src ?? null,
  }));

  return (
    <>
      <PageHeader
        title="Teste de dano"
        description="Escolha os Pokémon da Pokédex, informe o dano de cada um e veja até qual hazard o time vai e como dividir a rotação. Tudo fica salvo neste navegador."
        badge={<Badge tone="teal">{source === "supabase" ? "Banco de dados" : "Lista importada"}</Badge>}
      />
      <DamageTest options={options} />
    </>
  );
}
