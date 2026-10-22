/** Verificações de integridade da Pokédex. Uso: npm run check:pokedex (sai com erro se algo falhar). */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { pokemonWithPrices } from "../src/data/pokemon";
import { pokedexReference } from "../src/data/pokedexReference";
import { rawPokemonList } from "../src/data/pokemonSource";
import { parsePokemonList } from "../src/lib/importPokemon";
import { buildPokedexEntries } from "../src/lib/pokedex";
import { emptyPokedexFilters, filterEntries, NORMAL_VARIANT, variantOptions } from "../src/lib/pokedexFilters";
import { tierKeyOf } from "../src/lib/tierFilters";

let passed = 0;
const check = (name: string, fn: () => void) => { fn(); passed++; console.log(`ok  ${name}`); };

const entries = buildPokedexEntries(pokemonWithPrices);
const byId = new Map(entries.map((e) => [e.pokemon.id, e]));
const get = (id: string) => { const e = byId.get(id); assert.ok(e, `registro ${id} não encontrado`); return e; };
const run = (patch: Partial<typeof emptyPokedexFilters>) => filterEntries(entries, { ...emptyPokedexFilters, ...patch });

check("usa os 854 registros reais de Tiers e Valores, sem IDs repetidos", () => {
  assert.equal(entries.length, 854);
  assert.equal(new Set(entries.map((e) => e.pokemon.id)).size, 854);
  entries.forEach((e, i) => assert.equal(e.pokemon, pokemonWithPrices[i]));
});

check("tier, tipo ofensivo e preços são idênticos à fonte importada (nada alterado)", () => {
  const source = new Map(parsePokemonList(rawPokemonList).pokemon.map((p) => [p.id, p]));
  for (const e of entries) {
    const s = source.get(e.pokemon.id)!;
    assert.equal(e.pokemon.tier, s.tier);
    assert.equal(e.pokemon.listedType, s.listedType);
    assert.equal(e.pokemon.sourceName, s.sourceName);
    assert.equal(e.pokemon.priceKk, null);
    assert.equal(e.pokemon.priceBrl, null);
  }
});

check("dados de demonstração removidos", () => {
  assert.equal(existsSync("src/data/demoPokemon.ts"), false);
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
  const offenders = walk("src").filter((f) => /\.(ts|tsx)$/.test(f) && /demoPokemon|isDemo/.test(readFileSync(f, "utf8")));
  assert.deepEqual(offenders, []);
});

check("Shiny Blaziken: original Fogo/Lutador, ofensivo Lutador, imagem Shiny", () => {
  const e = get("shiny-blaziken");
  assert.deepEqual(e.originalTypes, ["fire", "fighting"]);
  assert.deepEqual(e.offensiveTypes, ["fighting"]);
  assert.equal(e.pokemon.tier, "Ultra Rare");
  assert.match(e.image!.src, /official-artwork\/shiny\/257\.png$/);
});

check("tipo ofensivo vem só do registro; nunca é deduzido da tipagem original", () => {
  for (const e of entries) assert.deepEqual(e.offensiveTypes, e.pokemon.listedType ? [e.pokemon.listedType] : []);
  const differ = entries.filter((e) => e.originalTypes && e.offensiveTypes.length && e.originalTypes.join() !== e.offensiveTypes.join());
  assert.ok(differ.length > 100, "deve haver muitos registros em que os dois grupos diferem");
});

check("Shiny e normal têm imagens diferentes; Shiny nunca usa a imagem normal", () => {
  let pairs = 0;
  for (const e of entries.filter((x) => x.pokemon.variant === "Shiny")) {
    const normal = byId.get(e.pokemon.id.replace(/^shiny-/, ""));
    if (!normal?.image || !e.image) continue;
    assert.notEqual(e.image.src, normal.image.src, e.pokemon.id);
    assert.match(e.image.src, /\/shiny\//);
    pairs++;
  }
  assert.ok(pairs > 400);
});

check("Mega usa a forma Mega (tipos e imagem próprios)", () => {
  const e = get("mega-clefable");
  assert.deepEqual(e.originalTypes, ["fairy", "flying"]);
  assert.match(e.image!.src, /official-artwork\/10278\.png$/);
  assert.deepEqual(get("clefable").originalTypes, ["fairy"]);
  assert.deepEqual(get("mega-houndoom").originalTypes, ["dark", "fire"]);
});

check("pendências são exatamente as esperadas (Lopuny e Shiny Lopuny)", () => {
  const noTypes = entries.filter((e) => e.originalTypes === null).map((e) => e.pokemon.id);
  const noImage = entries.filter((e) => e.image === null).map((e) => e.pokemon.id);
  assert.deepEqual(noTypes, ["lopuny", "shiny-lopuny"]);
  assert.deepEqual(noImage, ["lopuny", "shiny-lopuny"]);
  assert.equal(pokedexReference["lopuny"], undefined);
});

check("busca por nome (sem acento/maiúsculas) e por variante no nome", () => {
  assert.deepEqual(run({ query: "shiny blaziken" }).map((e) => e.pokemon.id), ["shiny-blaziken"]);
  assert.equal(run({ query: "FLABEBE" }).length, 2);
  assert.equal(run({ query: "zzz" }).length, 0);
});

check("filtros individuais e combinados batem com cálculo independente", () => {
  const all = entries;
  const exp = (fn: (e: (typeof all)[number]) => boolean) => all.filter(fn).length;
  assert.equal(run({ variant: "Shiny" }).length, 423);
  assert.equal(run({ variant: "Mega" }).length, 5);
  assert.equal(run({ variant: NORMAL_VARIANT }).length, 854 - 423 - 5);
  assert.equal(run({ originalType: "fire" }).length, exp((e) => !!e.originalTypes?.includes("fire")));
  assert.equal(run({ offensiveType: "fighting" }).length, exp((e) => e.pokemon.listedType === "fighting"));
  assert.equal(run({ tier: "undefined" }).length, 58);
  assert.equal(run({ tier: "Mythic" }).length, 3);
  const combo = run({ variant: "Shiny", originalType: "fire", offensiveType: "fighting" });
  assert.equal(combo.length, exp((e) => e.pokemon.variant === "Shiny" && !!e.originalTypes?.includes("fire") && e.pokemon.listedType === "fighting"));
  assert.ok(combo.some((e) => e.pokemon.id === "shiny-blaziken"));
  assert.ok(combo.every((e) => e.pokemon.variant === "Shiny"));
  const four = run({ variant: "Shiny", originalType: "fire", offensiveType: "fighting", tier: "Ultra Rare", query: "blaz" });
  assert.deepEqual(four.map((e) => e.pokemon.id), ["shiny-blaziken"]);
  assert.equal(run({}).length, 854); // limpar filtros
  console.log(`      (Shiny + original Fogo + ofensivo Lutador = ${combo.length}: ${combo.map((e) => e.pokemon.name).join(", ")})`);
});

check("variantes oferecidas vêm dos dados", () => assert.deepEqual(variantOptions(entries), ["Mega", "Shiny"]));

check("tier não definido é uma categoria própria (nunca um tier especial)", () => {
  assert.equal(entries.filter((e) => tierKeyOf(e.pokemon) === "undefined").length, 58);
});

console.log(`\n${passed} verificações passaram.`);
