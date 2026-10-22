import { POKEMON_TYPES, TIERS, type Pokemon, type PokemonType, type Tier } from "@/types/pokemon";

export type ImportIssue = { line: number; sourceName: string; problem: string };
export type ImportResult = { pokemon: Pokemon[]; issues: ImportIssue[] };

const VARIANT_PREFIXES = ["Shiny", "Mega"];

function slugify(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * Lê a lista bruta (Nome | Tier | Tipo, separados por "|" ou tabulação).
 * "?" ou vazio viram `null`. Nenhuma linha identificável é descartada;
 * anomalias são devolvidas em `issues` para revisão.
 */
export function parsePokemonList(raw: string): ImportResult {
  const pokemon: Pokemon[] = [];
  const issues: ImportIssue[] = [];
  const seenNames = new Set<string>();
  const usedIds = new Set<string>();

  raw.split(/\r?\n/).forEach((line, index) => {
    if (!line.trim()) return;
    const lineNumber = index + 1;
    const parts = line.split(/\t|\|/).map((part) => part.trim());
    const [sourceName = "", rawTier = "", rawType = ""] = parts;
    const report = (problem: string) => issues.push({ line: lineNumber, sourceName: sourceName || line.trim(), problem });

    if (!sourceName) return report("Linha sem nome; não foi possível importar.");
    if (parts.length < 3) report("Linha com menos de 3 colunas; campos ausentes tratados como não definidos.");

    let tier: Tier | null = null;
    if (rawTier === "") {
      if (parts.length >= 3) report("Tier vazio; tratado como não definido.");
    } else if (rawTier !== "?") {
      tier = TIERS.find((t) => t === rawTier) ?? null;
      if (!tier) report(`Tier não reconhecido: "${rawTier}".`);
    }

    let listedType: PokemonType | null = null;
    if (rawType === "") {
      if (parts.length >= 3) report("Tipo vazio; tratado como não definido.");
    } else if (rawType !== "?") {
      listedType = POKEMON_TYPES.find((t) => t === rawType.toLowerCase()) ?? null;
      if (!listedType) report(`Tipo não reconhecido: "${rawType}".`);
    }

    const key = sourceName.toLowerCase();
    if (seenNames.has(key)) report("Nome repetido na lista; registro mantido com ID diferente.");
    seenNames.add(key);

    let id = slugify(sourceName) || `linha-${lineNumber}`;
    for (let n = 2; usedIds.has(id); n++) id = `${slugify(sourceName)}-${n}`;
    usedIds.add(id);

    const variant = VARIANT_PREFIXES.find((v) => sourceName.startsWith(`${v} `));
    pokemon.push({
      id,
      sourceName,
      name: variant ? sourceName.slice(variant.length + 1) : sourceName,
      ...(variant ? { variant } : {}),
      // A lista não informa tipos defensivos/ofensivos separados.
      defensiveTypes: [],
      offensiveTypes: [],
      tier,
      listedType,
      source: { line: lineNumber, tier: rawTier, type: rawType },
    });
  });

  return { pokemon, issues };
}
