/**
 * Gera supabase/seed/0002_pokemon.sql a partir dos dados do projeto
 * (src/data/pokemonSource.ts + src/data/prices.ts).
 *
 * Uso:  npm run db:seed:generate
 *
 * O SQL gerado é seguro para rodar várias vezes:
 *  - registros: INSERT ... ON CONFLICT (id) DO NOTHING (nunca sobrescreve edições feitas no banco);
 *  - preços: só preenche campos que ainda estão NULL no banco (nunca sobrescreve, nem um preço 0).
 * Não usa nenhuma chave secreta: o arquivo é colado no SQL Editor do Supabase.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { importIssues, pokemonList } from "../src/data/pokemon";
import { initialPrices } from "../src/data/prices";

const lit = (value: string | null | undefined): string =>
  value == null ? "NULL" : `'${value.replace(/'/g, "''")}'`;

const ids = new Set(pokemonList.map((p) => p.id));
const unknown = Object.keys(initialPrices).filter((id) => !ids.has(id));
if (unknown.length > 0) {
  console.error(`prices.ts tem IDs que não existem na lista: ${unknown.join(", ")}`);
  process.exit(1);
}

const rows = pokemonList.map((p) => {
  const line = p.source?.line ?? null;
  const notes = importIssues.filter((i) => i.line === line).map((i) => i.problem).join(" ");
  return `  (${[
    lit(p.id),
    lit(p.name),
    lit(p.variant ?? null),
    lit(p.tier ?? null),
    lit(p.listedType ?? null),
    lit(p.sourceName ?? null),
    lit(p.source?.tier ?? null),
    lit(p.source?.type ?? null),
    line ?? "NULL",
    lit(notes || null),
  ].join(", ")})`;
});

const CHUNK = 200;
const inserts: string[] = [];
for (let i = 0; i < rows.length; i += CHUNK) {
  inserts.push(
    `insert into public.pokemon\n  (id, name, variant, tier, listed_type, source_name, source_tier_raw, source_type_raw, source_line, review_notes)\nvalues\n${rows
      .slice(i, i + CHUNK)
      .join(",\n")}\non conflict (id) do nothing;`,
  );
}

const priceStatements = Object.entries(initialPrices).flatMap(([id, price]) => {
  const out: string[] = [];
  if (price.kk != null) out.push(`update public.pokemon set price_kk = ${price.kk} where id = ${lit(id)} and price_kk is null;`);
  if (price.brl != null) out.push(`update public.pokemon set price_brl = ${price.brl} where id = ${lit(id)} and price_brl is null;`);
  return out;
});

const sql = `-- GERADO por scripts/generate-seed.ts — não edite à mão.
-- Registros: ${pokemonList.length} | Preços: ${priceStatements.length} comando(s)
-- Seguro para rodar de novo: não duplica e não sobrescreve dados já editados no banco.
-- Pré-requisito: supabase/migrations/0001_schema.sql já executado.

begin;

${inserts.join("\n\n")}

-- Preços iniciais (src/data/prices.ts). Só preenche o que está NULL.
${priceStatements.length > 0 ? priceStatements.join("\n") : "-- Nenhum preço cadastrado em src/data/prices.ts."}

commit;

-- Conferência (deve mostrar ${pokemonList.length} registros):
select count(*) as registros,
       count(*) filter (where tier is null) as sem_tier,
       count(*) filter (where listed_type is null) as sem_tipo,
       count(*) filter (where is_incomplete) as para_revisao,
       count(*) filter (where price_kk is not null or price_brl is not null) as com_preco
from public.pokemon;
`;

mkdirSync("supabase/seed", { recursive: true });
writeFileSync("supabase/seed/0002_pokemon.sql", sql);
console.log(`Gerado supabase/seed/0002_pokemon.sql: ${pokemonList.length} registros, ${priceStatements.length} comando(s) de preço.`);
