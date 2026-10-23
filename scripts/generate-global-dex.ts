/**
 * Gera src/data/globalDex.ts: a Pokédex global completa (espécies + formas Mega, regionais e Primal),
 * com número, tipos originais e evoluções, a partir dos CSVs do PokéAPI no GitHub.
 *
 * Uso:  npm run dex:global   (precisa de internet; leva alguns segundos)
 * Depois, faça commit do arquivo gerado.
 */
import { writeFileSync } from "node:fs";
import { buildGlobalDex, type CsvRow } from "./global-dex-builder";

const CSV = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";

/** Lê uma linha de CSV respeitando campos entre aspas. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

async function csv(name: string): Promise<CsvRow[]> {
  const res = await fetch(`${CSV}/${name}.csv`);
  if (!res.ok) throw new Error(`Falha ao baixar ${name}.csv (${res.status})`);
  const [header, ...lines] = (await res.text()).replace(/\r/g, "").trim().split("\n");
  const cols = parseLine(header);
  return lines.filter(Boolean).map((line) => Object.fromEntries(parseLine(line).map((v, i) => [cols[i], v])));
}

async function main() {
  const [pokemon, species, speciesNames, pokemonTypes, types] = await Promise.all([
    csv("pokemon"), csv("pokemon_species"), csv("pokemon_species_names"), csv("pokemon_types"), csv("types"),
  ]);
  const { entries, report } = buildGlobalDex({ pokemon, species, speciesNames, pokemonTypes, types });
  if (entries.length < 1000) throw new Error(`Só ${entries.length} entradas geradas; algo está errado nos CSVs. Nada foi gravado.`);

  const lines = entries.map((e) => `  ${JSON.stringify(e)},`);
  writeFileSync(
    "src/data/globalDex.ts",
    `// GERADO por scripts/generate-global-dex.ts (npm run dex:global) — não edite à mão.
// Fonte: PokéAPI (CSV). Pokémon e seus nomes são marcas da Nintendo.
import type { GlobalDexEntry } from "@/types/globalDex";

export const globalDex: GlobalDexEntry[] = [
${lines.join("\n")}
];
`,
  );

  const forms = entries.filter((e) => e.variant).length;
  console.log(`Pokédex global: ${entries.length} entradas (${entries.length - forms} normais, ${forms} formas).`);
  if (report.skipped.length) console.log(`Ignoradas (${report.skipped.length}):\n  ${report.skipped.join("\n  ")}`);
  if (report.duplicates.length) console.log(`IDs repetidos descartados (${report.duplicates.length}): ${report.duplicates.join(", ")}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
