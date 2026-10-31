import { spriteUrl } from "@/config/images";

/**
 * Custo para subir de `current` até `goal` stars. Cada poke de n estrelas nasce da fusão de dois pokes de n−1 estrelas
 * mais `factor × n` KK; o poke normal (0 estrelas) não custa KK, mas é contado. Os pokes que a pessoa já tem sobrando
 * (`spare[n]`, n de 1 a 4) entram nas fusões de graça. O próprio Pokémon, com as stars que já tem, também conta como sobra.
 */
export function starCost(factor: number, current: number, goal: number, spare: readonly number[]): { kk: number; normals: number } {
  const have = [...spare];
  let normals = 0;
  if (current > 0) have[current] = (have[current] ?? 0) + 1;

  const make = (n: number): number => {
    if (n === 0) {
      normals++;
      return 0;
    }
    if ((have[n] ?? 0) > 0) {
      have[n]--;
      return 0;
    }
    return make(n - 1) + make(n - 1) + factor * n;
  };

  const kk = make(goal - 1) + make(goal - 1) + factor * goal;
  return { kk, normals };
}

/** Lê a chave da arte: "25" (normal), "s25" (shiny) ou "m10278" (forma). */
function parseArt(art: string): { id: string; shiny: boolean } {
  const m = art.match(/^(s)?m?(\d+)$/);
  return { id: m?.[2] ?? art, shiny: !!m?.[1] };
}

/** Sprite pequeno (rápido de carregar): o das listas e botões. */
export function smallArt(art: string): string {
  const { id, shiny } = parseArt(art);
  return spriteUrl(`${shiny ? "shiny/" : ""}${id}.png`);
}

/** Arte oficial grande: a do Pokémon escolhido. */
export function bigArt(art: string): string {
  const { id, shiny } = parseArt(art);
  return spriteUrl(`other/official-artwork/${shiny ? "shiny/" : ""}${id}.png`);
}
