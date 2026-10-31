import { spriteUrl } from "@/config/images";
import { linkedTasks, type HuntType } from "@/data/linkedTasks";
import { getGlobalDex } from "@/lib/globalDex";

/** Uma tarefa pronta para a tela: com o número, e a imagem (e uma de reserva) já resolvidas. */
export type TaskView = { n: number; mobs: number; pokemon: string; hunt: HuntType; src: string | null; fallback: string | null };

/** Sem acento, sem pontuação e em minúsculas: "Farfetch'd" e "Farfetch’d" viram a mesma chave. */
const key = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const artwork = (id: number) => spriteUrl(`other/official-artwork/${id}.png`);

/** As tarefas na ordem do jogo, numeradas a partir de 1, com a arte oficial de cada Pokémon (forma normal). */
export function buildTaskViews(): TaskView[] {
  // Só formas normais (sem Mega, Alolan etc.): a primeira de cada nome ganha.
  const byName = new Map<string, { id: number; src: string | null }>();
  for (const e of getGlobalDex()) {
    if (e.variant || byName.has(key(e.name))) continue;
    byName.set(key(e.name), { id: e.pokeapiId, src: e.images?.normal ? spriteUrl(e.images.normal) : artwork(e.pokeapiId) });
  }

  return linkedTasks.map((t, i) => {
    const species = byName.get(key(t.pokemon)) ?? byName.get(key(t.pokemon.split(" ")[0]));
    const src = t.art ? artwork(t.art) : (species?.src ?? null);
    // Arte de forma pode não existir no PokéAPI: cai para a do Pokémon base.
    const fallback = t.art && species && species.src !== src ? species.src : null;
    return { n: i + 1, mobs: t.mobs, pokemon: t.pokemon, hunt: t.hunt, src, fallback };
  });
}
