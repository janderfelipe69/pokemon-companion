/**
 * Monta a Pokédex global a partir dos CSVs do PokéAPI. Função pura (sem rede), para poder ser testada.
 * Quem baixa os CSVs e grava o arquivo é scripts/generate-global-dex.ts.
 */
import { POKEMON_TYPES, type PokemonType } from "../src/types/pokemon";
import type { GlobalDexEntry } from "../src/types/globalDex";

export type CsvRow = Record<string, string>;
export type DexCsvs = {
  pokemon: CsvRow[]; // id, identifier, species_id, is_default
  species: CsvRow[]; // id, identifier, evolves_from_species_id
  speciesNames: CsvRow[]; // pokemon_species_id, local_language_id, name
  pokemonTypes: CsvRow[]; // pokemon_id, type_id, slot
  types: CsvRow[]; // id, identifier
};
export type BuildReport = { skipped: string[]; duplicates: string[] };

const ENGLISH = "9";

/** Nomes que a lista do jogo escreve de outro jeito que o PokéAPI. */
const NAME_OVERRIDES: Record<string, string> = { "nidoran-f": "Nidoran Female", "nidoran-m": "Nidoran Male" };

/** Sufixos de forma do PokéAPI que entram na Pokédex global. Para incluir mais formas, acrescente aqui. */
const FORM_SUFFIXES: Record<string, { variant: string; nameSuffix?: string }> = {
  mega: { variant: "Mega" },
  "mega-x": { variant: "Mega", nameSuffix: " X" },
  "mega-y": { variant: "Mega", nameSuffix: " Y" },
  primal: { variant: "Primal" },
  alola: { variant: "Alolan" },
  galar: { variant: "Galarian" },
  hisui: { variant: "Hisuian" },
  paldea: { variant: "Paldean" },
};

/** Formas com identificador fora do padrão "<espécie>-<sufixo>". */
const EXTRA_FORMS: Record<string, { variant: string; nameSuffix?: string }> = {
  "darmanitan-galar-standard": { variant: "Galarian" },
  "tauros-paldea-combat-breed": { variant: "Paldean", nameSuffix: " (Combat Breed)" },
  "tauros-paldea-blaze-breed": { variant: "Paldean", nameSuffix: " (Blaze Breed)" },
  "tauros-paldea-aqua-breed": { variant: "Paldean", nameSuffix: " (Aqua Breed)" },
};

/** Evoluções que só existem a partir da forma regional (o PokéAPI as liga à espécie base). */
const REGIONAL_ONLY: Record<string, { parent: string; variant: string }> = {
  perrserker: { parent: "meowth", variant: "Galarian" },
  obstagoon: { parent: "linoone", variant: "Galarian" },
  "mr-rime": { parent: "mr-mime", variant: "Galarian" },
  cursola: { parent: "corsola", variant: "Galarian" },
  sirfetchd: { parent: "farfetchd", variant: "Galarian" },
  runerigus: { parent: "yamask", variant: "Galarian" },
  overqwil: { parent: "qwilfish", variant: "Hisuian" },
  sneasler: { parent: "sneasel", variant: "Hisuian" },
  clodsire: { parent: "wooper", variant: "Paldean" },
};

const REGIONAL = new Set(["Alolan", "Galarian", "Hisuian", "Paldean"]);

export const slug = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const titleOf = (e: Pick<GlobalDexEntry, "name" | "variant">) => (e.variant ? `${e.variant} ${e.name}` : e.name);

export function buildGlobalDex(csvs: DexCsvs): { entries: GlobalDexEntry[]; report: BuildReport } {
  const report: BuildReport = { skipped: [], duplicates: [] };
  const speciesById = new Map(csvs.species.map((s) => [s.id, s]));
  const typeName = new Map(csvs.types.map((t) => [t.id, t.identifier]));
  const englishName = new Map(
    csvs.speciesNames.filter((n) => n.local_language_id === ENGLISH).map((n) => [n.pokemon_species_id, n.name]),
  );
  const nameOf = (speciesIdentifier: string, speciesId: string) =>
    NAME_OVERRIDES[speciesIdentifier] ?? englishName.get(speciesId) ?? speciesIdentifier;

  const typesOf = (pokemonId: string): PokemonType[] | null => {
    const list = csvs.pokemonTypes
      .filter((l) => l.pokemon_id === pokemonId)
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((l) => typeName.get(l.type_id) ?? "");
    return list.length > 0 && list.every((t) => (POKEMON_TYPES as readonly string[]).includes(t)) ? (list as PokemonType[]) : null;
  };

  type Draft = GlobalDexEntry & { speciesId: string; speciesIdentifier: string };
  const drafts: Draft[] = [];
  const seenIds = new Set<string>();

  const add = (draft: Draft) => {
    if (seenIds.has(draft.id)) return void report.duplicates.push(draft.id);
    seenIds.add(draft.id);
    drafts.push(draft);
  };

  const rows = [...csvs.pokemon].sort((a, b) => Number(a.id) - Number(b.id));
  for (const row of rows) {
    const species = speciesById.get(row.species_id);
    if (!species) continue;
    const isDefault = row.is_default === "1";

    let variant: string | null = null;
    let nameSuffix = "";
    if (!isDefault) {
      const extra = EXTRA_FORMS[row.identifier];
      const rest = row.identifier.startsWith(`${species.identifier}-`) ? row.identifier.slice(species.identifier.length + 1) : "";
      const form = extra ?? FORM_SUFFIXES[rest];
      if (!form) continue; // formas de batalha, cosméticas, bonés etc. ficam de fora
      variant = form.variant;
      nameSuffix = form.nameSuffix ?? "";
    }

    const types = typesOf(row.id);
    if (!types) {
      report.skipped.push(`${row.identifier}: tipos ausentes ou inválidos`);
      continue;
    }
    const name = nameOf(species.identifier, species.id) + nameSuffix;
    add({
      id: slug(variant ? `${variant} ${name}` : name),
      name,
      variant,
      dex: Number(species.id),
      pokeapiId: Number(row.id),
      types,
      speciesId: species.id,
      speciesIdentifier: species.identifier,
    });
  }

  // Evoluções --------------------------------------------------------------
  const baseBySpecies = new Map(drafts.filter((d) => d.variant === null).map((d) => [d.speciesId, d]));
  const formBySpeciesAndVariant = new Map(drafts.filter((d) => d.variant !== null).map((d) => [`${d.speciesId}:${d.variant}`, d]));
  const childrenOf = (speciesId: string) =>
    csvs.species.filter((s) => s.evolves_from_species_id === speciesId).sort((a, b) => Number(a.id) - Number(b.id));
  const titleFor = (speciesId: string, variant: string | null) => {
    const d = (variant && formBySpeciesAndVariant.get(`${speciesId}:${variant}`)) || baseBySpecies.get(speciesId);
    return d ? titleOf(d) : nameOf(speciesById.get(speciesId)?.identifier ?? "", speciesId);
  };

  for (const d of drafts) {
    const regional = d.variant !== null && REGIONAL.has(d.variant);
    if (d.variant !== null && !regional) {
      // Mega e Primal não são evoluções.
      d.evolvesFrom = null;
      d.evolvesTo = [];
      continue;
    }

    const species = speciesById.get(d.speciesId)!;
    const only = REGIONAL_ONLY[d.speciesIdentifier]; // este Pokémon só evolui de uma forma regional
    if (species.evolves_from_species_id) {
      d.evolvesFrom = titleFor(species.evolves_from_species_id, only?.variant ?? d.variant);
    } else {
      d.evolvesFrom = null;
    }

    const children = childrenOf(d.speciesId);
    const exclusive = regional ? children.filter((c) => REGIONAL_ONLY[c.identifier]?.parent === d.speciesIdentifier && REGIONAL_ONLY[c.identifier].variant === d.variant) : [];
    const picked = exclusive.length > 0 ? exclusive : children.filter((c) => !(REGIONAL_ONLY[c.identifier]?.parent === d.speciesIdentifier));
    d.evolvesTo = picked.map((c) => titleFor(c.id, d.variant));
  }

  const entries = drafts
    .sort((a, b) => a.dex - b.dex || a.pokeapiId - b.pokeapiId)
    .map(({ speciesId: _s, speciesIdentifier: _i, ...entry }) => entry);
  return { entries, report };
}
