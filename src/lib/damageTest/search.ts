import { normalize } from "@/lib/pokemonFilters";
import type { TierKey } from "@/config/tiers";

/** Pokémon da Pokédex disponível para escolha (só o necessário, para a página ficar leve). */
export type DexOption = { id: string; name: string; tier: TierKey; image: string | null };

export type Indexed = { option: DexOption; text: string; words: string[] };

export const buildSearchIndex = (options: readonly DexOption[]): Indexed[] =>
  options.map((option) => {
    const text = normalize(option.name);
    return { option, text, words: text.split(/[\s\-.'’]+/).filter(Boolean) };
  });

/**
 * Busca por início de palavra, então "sh hou" acha "Shiny Houndoom". Termos com 3+ letras
 * também valem no meio do nome. Sem texto, devolve os primeiros da lista.
 */
export function searchPokemon(index: readonly Indexed[], query: string, limit = 8): DexOption[] {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return index.slice(0, limit).map((i) => i.option);
  const joined = tokens.join(" ");
  const scored: { option: DexOption; score: number }[] = [];
  for (const { option, text, words } of index) {
    let score = text.startsWith(joined) ? 3 : 0;
    let match = true;
    for (const t of tokens) {
      if (words.some((w) => w.startsWith(t))) score += 2;
      else if (t.length >= 3 && text.includes(t)) score += 1;
      else {
        match = false;
        break;
      }
    }
    if (match) scored.push({ option, score });
  }
  return scored.sort((a, b) => b.score - a.score || a.option.name.localeCompare(b.option.name, "pt-BR")).slice(0, limit).map((s) => s.option);
}
