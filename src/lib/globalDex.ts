import { spriteUrl } from "@/config/images";
import { globalDex } from "@/data/globalDex";
import { pokedexReference } from "@/data/pokedexReference";
import type { GlobalDexEntry } from "@/types/globalDex";

/** Sem o arquivo gerado, a Pokédex global usa só as formas já presentes em pokedexReference.ts. */
export const GLOBAL_DEX_IS_PARTIAL = globalDex.length === 0;

const niceName = (key: string) => key.split("-").map((part) => (part[0]?.toUpperCase() ?? "") + part.slice(1)).join(" ");

function fromReference(): GlobalDexEntry[] {
  return Object.entries(pokedexReference)
    .flatMap(([key, ref]) => {
      if (!ref) return [];
      const mega = key.startsWith("mega-");
      return [{
        id: key,
        name: niceName(mega ? key.slice("mega-".length) : key),
        variant: mega ? "Mega" : null,
        dex: ref.dexNumber,
        pokeapiId: ref.pokeapiId,
        types: ref.types,
        images: ref.images,
      } satisfies GlobalDexEntry];
    })
    .sort((a, b) => a.dex - b.dex || a.pokeapiId - b.pokeapiId);
}

/** Todas as formas disponíveis para cadastro, ordenadas pelo número da Pokédex. */
export const getGlobalDex = (): GlobalDexEntry[] => (globalDex.length > 0 ? globalDex : fromReference());

export const entryTitle = (e: Pick<GlobalDexEntry, "name" | "variant">) => (e.variant ? `${e.variant} ${e.name}` : e.name);

/** Caminho relativo da imagem (official-artwork por padrão). Shiny nunca cai para a imagem normal. */
export function entryImagePath(e: GlobalDexEntry, shiny: boolean): string | null {
  if (e.images) return shiny ? e.images.shiny : e.images.normal;
  return `other/official-artwork/${shiny ? "shiny/" : ""}${e.pokeapiId}.png`;
}

export function entryImageUrl(e: GlobalDexEntry, shiny: boolean): string | null {
  const path = entryImagePath(e, shiny);
  return path ? spriteUrl(path) : null;
}

/**
 * Como a forma é gravada no catálogo. Shiny usa o prefixo "shiny-" no ID (como os registros atuais) e,
 * quando a forma é Mega/regional, leva o nome completo para não perder a informação da forma.
 */
export function catalogRecordOf(e: GlobalDexEntry, shiny: boolean): { id: string; name: string; variant: string | null } {
  if (!shiny) return { id: e.id, name: e.name, variant: e.variant };
  return { id: `shiny-${e.id}`, name: entryTitle(e), variant: "Shiny" };
}

/** Lista as variantes presentes, para o filtro. */
export const dexVariants = (list: GlobalDexEntry[]): string[] =>
  [...new Set(list.flatMap((e) => (e.variant ? [e.variant] : [])))].sort();
