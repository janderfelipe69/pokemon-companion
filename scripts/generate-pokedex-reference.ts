/**
 * Gera src/data/pokedexReference.ts: tipagem original e caminho de imagem de cada forma,
 * a partir dos CSVs do PokéAPI e do repositório PokeAPI/sprites (ambos no GitHub).
 *
 * Uso:  npm run pokedex:generate   (precisa de internet)
 *
 * Associação EXATA, sem aproximação:
 *  nome da lista -> identificador de espécie do PokéAPI (normalização fixa + exceções explícitas)
 *  -> forma padrão da espécie (ou "<espécie>-mega" para Mega) -> tipos e imagem dessa forma.
 * O que não resolver fica de fora e é listado no relatório (nunca é deduzido).
 */
import { writeFileSync } from "node:fs";
import { pokemonList } from "../src/data/pokemon";
import { POKEMON_TYPES, type PokemonType } from "../src/types/pokemon";

const CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

/** Exceções explícitas: nome normalizado da lista -> identificador de espécie no PokéAPI. */
const SPECIES_OVERRIDES: Record<string, string> = {
  "nidoran-female": "nidoran-f",
  "nidoran-male": "nidoran-m",
};

async function csv(name: string): Promise<Record<string, string>[]> {
  const res = await fetch(`${CSV}/${name}.csv`);
  if (!res.ok) throw new Error(`Falha ao baixar ${name}.csv (${res.status})`);
  const [header, ...lines] = (await res.text()).trim().split("\n");
  const cols = header.split(",");
  return lines.map((line) => Object.fromEntries(line.split(",").map((v, i) => [cols[i], v])));
}

const slug = (text: string) =>
  text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[.'’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function exists(path: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${SPRITES}/${path}`, { method: "HEAD" });
      if (res.status === 404) return false;
      if (res.ok) return (res.headers.get("content-type") ?? "").startsWith("image/");
    } catch {
      /* tenta de novo */
    }
  }
  throw new Error(`Não foi possível verificar ${path}`);
}

/** Prioridade: official-artwork, depois showdown. Nunca usa a imagem normal para Shiny. */
async function findImage(id: number, shiny: boolean): Promise<string | null> {
  const dir = shiny ? "shiny/" : "";
  for (const path of [`other/official-artwork/${dir}${id}.png`, `other/showdown/${dir}${id}.gif`]) {
    if (await exists(path)) return path;
  }
  return null;
}

async function pool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

async function main() {
  const [pokemonRows, speciesRows, typeLinks, typeRows] = await Promise.all([
    csv("pokemon"), csv("pokemon_species"), csv("pokemon_types"), csv("types"),
  ]);
  const speciesByIdentifier = new Map(speciesRows.map((r) => [r.identifier, r.id]));
  const pokemonByIdentifier = new Map(pokemonRows.map((r) => [r.identifier, r]));
  const defaultBySpecies = new Map(pokemonRows.filter((r) => r.is_default === "1").map((r) => [r.species_id, r]));
  const typeName = new Map(typeRows.map((r) => [r.id, r.identifier]));

  // Uma entrada por forma: o registro Shiny compartilha a forma do registro normal.
  const forms = new Map<string, { name: string; mega: boolean; normal: boolean; shiny: boolean }>();
  for (const p of pokemonList) {
    const isShiny = p.variant === "Shiny" && p.id.startsWith("shiny-");
    const key = isShiny ? p.id.slice("shiny-".length) : p.id;
    const form = forms.get(key) ?? { name: p.name, mega: p.variant === "Mega", normal: false, shiny: false };
    if (isShiny) form.shiny = true;
    else form.normal = true;
    forms.set(key, form);
  }

  const unresolved: { key: string; reason: string }[] = [];
  const resolved: { key: string; id: number; dex: number; types: PokemonType[]; needs: { normal: boolean; shiny: boolean } }[] = [];

  for (const [key, form] of forms) {
    const base = slug(form.name);
    const speciesIdentifier = SPECIES_OVERRIDES[base] ?? base;
    const speciesId = speciesByIdentifier.get(speciesIdentifier);
    if (!speciesId) { unresolved.push({ key, reason: `espécie "${speciesIdentifier}" não existe no PokéAPI` }); continue; }
    const row = form.mega ? pokemonByIdentifier.get(`${speciesIdentifier}-mega`) : defaultBySpecies.get(speciesId);
    if (!row || row.species_id !== speciesId) { unresolved.push({ key, reason: `forma não encontrada no PokéAPI` }); continue; }
    const types = typeLinks
      .filter((l) => l.pokemon_id === row.id)
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((l) => typeName.get(l.type_id) as string);
    if (types.length === 0 || types.some((t) => !(POKEMON_TYPES as readonly string[]).includes(t))) {
      unresolved.push({ key, reason: `tipos inválidos ou ausentes (${types.join("/")})` });
      continue;
    }
    resolved.push({ key, id: Number(row.id), dex: Number(speciesId), types: types as PokemonType[], needs: { normal: form.normal, shiny: form.shiny } });
  }

  const images = await pool(resolved, 10, async (r) => ({
    normal: r.needs.normal ? await findImage(r.id, false) : null,
    shiny: r.needs.shiny ? await findImage(r.id, true) : null,
  }));

  const lines = resolved.map((r, i) => {
    const img = images[i];
    const j = (v: string | null) => (v === null ? "null" : `"${v}"`);
    return `  "${r.key}": { pokeapiId: ${r.id}, dexNumber: ${r.dex}, types: [${r.types.map((t) => `"${t}"`).join(", ")}], images: { normal: ${j(img.normal)}, shiny: ${j(img.shiny)} } },`;
  });

  writeFileSync(
    "src/data/pokedexReference.ts",
    `// GERADO por scripts/generate-pokedex-reference.ts — não edite à mão (use pokedexOverrides.ts para ajustes).
// Fontes: PokéAPI (tipos, CSV) e PokeAPI/sprites (imagens). Pokémon e seus nomes são marcas da Nintendo.
import type { SpeciesRef } from "@/types/pokedex";

/** Chave = ID do registro sem o prefixo "shiny-". Formas ausentes não foram resolvidas. */
export const pokedexReference: Record<string, SpeciesRef | undefined> = {
${lines.join("\n")}
};
`,
  );

  const noNormal = resolved.filter((r, i) => r.needs.normal && !images[i].normal).map((r) => r.key);
  const noShiny = resolved.filter((r, i) => r.needs.shiny && !images[i].shiny).map((r) => `shiny-${r.key}`);
  const showdown = resolved.flatMap((r, i) => [images[i].normal, images[i].shiny].filter((p) => p?.includes("showdown")).map(() => r.key));
  console.log(`Formas na lista: ${forms.size} | resolvidas: ${resolved.length} | não resolvidas: ${unresolved.length}`);
  unresolved.forEach((u) => console.log(`  NÃO RESOLVIDA ${u.key}: ${u.reason}`));
  console.log(`Sem imagem normal: ${noNormal.length} ${noNormal.join(", ")}`);
  console.log(`Sem imagem Shiny:  ${noShiny.length} ${noShiny.join(", ")}`);
  console.log(`Imagens showdown (fallback): ${showdown.length} ${showdown.join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
