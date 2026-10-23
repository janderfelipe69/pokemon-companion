"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { POKEMON_TYPES, TIERS, type PokemonType } from "@/types/pokemon";
import { pokedexReference } from "@/data/pokedexReference";
import { spriteUrl } from "@/config/images";

type Row = {
  id: string;
  name: string;
  variant: string | null;
  tier: string | null;
  listed_type: string | null;
  notes: string | null;
  price_kk: string | number | null;
  price_brl: string | number | null;
  pokedex_number: number | null;
  level: number | null;
  game_type: string | null;
  image_url: string | null;
  evolution: string | null;
  evolution_item: string | null;
  pokemon_defensive_types?: { type_code: string; position: number }[];
  pokemon_offensive_types?: { type_code: string; position: number }[];
  pokemon_pokelog?: { stage_1: number | null; stage_2: number | null; stage_3: number | null }[] | null;
};

type FormData = {
  id: string;
  name: string;
  variant: string;
  tier: string;
  offensiveTypes: PokemonType[];
  notes: string;
  priceKk: string;
  priceBrl: string;
  pokedexNumber: string;
  level: string;
  gameType: string;
  imageUrl: string;
  evolution: string;
  evolutionItem: string;
  stages: [string, string, string];
};

const empty: FormData = {
  id: "", name: "", variant: "", tier: "", offensiveTypes: [], notes: "",
  priceKk: "", priceBrl: "", pokedexNumber: "", level: "", gameType: "",
  imageUrl: "", evolution: "", evolutionItem: "", stages: ["", "", ""],
};

const typeNames: Record<string, string> = {
  normal: "Normal", fire: "Fogo", water: "Água", electric: "Elétrico",
  grass: "Planta", ice: "Gelo", fighting: "Lutador", poison: "Veneno",
  ground: "Terra", flying: "Voador", psychic: "Psíquico", bug: "Inseto",
  rock: "Pedra", ghost: "Fantasma", dragon: "Dragão", dark: "Sombrio",
  steel: "Aço", fairy: "Fada",
};
const typeName = (type: string) => typeNames[type] ?? type;
const niceName = (key: string) =>
  key.split("-").map((part) => part[0]?.toUpperCase() + part.slice(1)).join(" ");

export function PokemonManager() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<FormData>(empty);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const referenceList = useMemo(
    () => Object.entries(pokedexReference)
      .filter((entry) => Boolean(entry[1]))
      .map(([key, ref]) => ({
        key,
        name: niceName(key),
        dex: ref!.dexNumber,
        types: ref!.types,
        image: ref!.images.normal ? spriteUrl(ref!.images.normal) : "",
      })),
    [],
  );

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return referenceList.filter((p) =>
      p.name.toLowerCase().includes(q) || p.key.includes(q) || String(p.dex) === q
    ).slice(0, 20);
  }, [search, referenceList]);

  async function loadRows() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/pokemon", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Erro ao carregar Pokémon.");
      setRows(data.pokemon ?? []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar Pokémon.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRows(); }, []);

  function choosePokemon(key: string) {
    const ref = pokedexReference[key];
    if (!ref) return;
    setForm({
      ...empty,
      id: key,
      name: niceName(key),
      pokedexNumber: String(ref.dexNumber),
      imageUrl: ref.images.normal ? spriteUrl(ref.images.normal) : "",
    });
    setSearch(niceName(key));
    setEditing(false);
    setMessage("");
    setError("");
  }

  function editPokemon(row: Row) {
    const key = row.id.startsWith("shiny-") ? row.id.slice(6) : row.id;
    const ref = pokedexReference[key];
    const log = Array.isArray(row.pokemon_pokelog) ? row.pokemon_pokelog[0] : undefined;
    const offensive = [...(row.pokemon_offensive_types ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((item) => item.type_code as PokemonType);
    setForm({
      id: row.id,
      name: row.name,
      variant: row.variant ?? "",
      tier: row.tier ?? "",
      offensiveTypes: offensive,
      notes: row.notes ?? "",
      priceKk: row.price_kk == null ? "" : String(row.price_kk),
      priceBrl: row.price_brl == null ? "" : String(row.price_brl),
      pokedexNumber: row.pokedex_number == null ? (ref ? String(ref.dexNumber) : "") : String(row.pokedex_number),
      level: row.level == null ? "" : String(row.level),
      gameType: row.game_type ?? "",
      imageUrl: row.image_url ?? (ref?.images.normal ? spriteUrl(ref.images.normal) : ""),
      evolution: row.evolution ?? "",
      evolutionItem: row.evolution_item ?? "",
      stages: [
        log?.stage_1 == null ? "" : String(log.stage_1),
        log?.stage_2 == null ? "" : String(log.stage_2),
        log?.stage_3 == null ? "" : String(log.stage_3),
      ],
    });
    setSearch(row.name);
    setEditing(true);
    setMessage("");
    setError("");
  }

  function toggleType(type: PokemonType) {
    setForm((old) => {
      if (old.offensiveTypes.includes(type)) {
        return { ...old, offensiveTypes: old.offensiveTypes.filter((t) => t !== type) };
      }
      if (old.offensiveTypes.length >= 2) return old;
      return { ...old, offensiveTypes: [...old.offensiveTypes, type] };
    });
  }

  async function savePokemon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    const key = form.id.startsWith("shiny-") ? form.id.slice(6) : form.id;
    const ref = pokedexReference[key];
    const existing = rows.find((row) => row.id === form.id);
    const defensiveTypes = ref?.types ??
      [...(existing?.pokemon_defensive_types ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((item) => item.type_code);

    try {
      const response = await fetch("/api/admin/pokemon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          name: form.name,
          variant: form.variant || null,
          tier: form.tier || null,
          listedType: form.offensiveTypes[0] ?? null,
          defensiveTypes,
          offensiveTypes: form.offensiveTypes,
          notes: form.notes,
          priceKk: form.priceKk,
          priceBrl: form.priceBrl,
          pokedexNumber: form.pokedexNumber,
          level: form.level,
          gameType: form.gameType,
          imageUrl: form.imageUrl,
          evolution: form.evolution,
          evolutionItem: form.evolutionItem,
          pokelogStages: form.stages,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      await loadRows();
      setMessage("Pokémon salvo no catálogo!");
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  function newForm() {
    setForm(empty);
    setSearch("");
    setEditing(false);
    setMessage("");
    setError("");
  }

  const fieldClass = "mt-1 w-full rounded-lg border border-white/15 bg-slate-950 px-3 py-2 text-white";
  const labelClass = "block text-sm text-slate-300";

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Cadastro de Pokémon</h2>
          <p className="mt-1 text-sm text-slate-400">Busque na Pokédex de referência e publique no catálogo do site.</p>
        </div>
        <button type="button" onClick={newForm} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/10">
          Novo cadastro
        </button>
      </div>

      {message && <p className="mb-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      <label className={labelClass}>
        Buscar Pokémon por nome ou número da Pokédex
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex.: Togetic, Bulbasaur, 175..." className={fieldClass} />
      </label>

      {results.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-slate-950">
          {results.map((p) => (
            <button key={p.key} type="button" onClick={() => choosePokemon(p.key)} className="flex w-full items-center gap-3 border-b border-white/5 px-3 py-2 text-left hover:bg-white/10">
              {p.image && <img src={p.image} alt="" className="h-12 w-12 object-contain" />}
              <span>
                <span className="block text-white">{p.name}</span>
                <span className="text-xs text-slate-400">Nº {p.dex} · {p.types.map(typeName).join(" / ")}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {search.trim() && results.length === 0 && !editing && <p className="mt-2 text-sm text-slate-400">Nenhum resultado encontrado na referência disponível.</p>}

      {form.id && (
        <form onSubmit={savePokemon} className="mt-5 space-y-5">
          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
            <div className="flex items-center gap-4">
              {form.imageUrl && <img src={form.imageUrl} alt={form.name} className="h-24 w-24 rounded-lg bg-slate-900 object-contain" />}
              <div>
                <h3 className="text-lg font-bold text-white">{form.name}</h3>
                <p className="text-sm text-slate-400">Pokédex nº {form.pokedexNumber || "—"}</p>
                <p className="text-xs text-slate-500">ID: {form.id}</p>
              </div>
            </div>
            <p className="mb-2 mt-4 text-sm font-medium text-slate-200">Tipos defensivos oficiais (automáticos)</p>
            <div className="flex flex-wrap gap-2">
              {(pokedexReference[form.id.startsWith("shiny-") ? form.id.slice(6) : form.id]?.types ??
                rows.find((r) => r.id === form.id)?.pokemon_defensive_types?.map((t) => t.type_code as PokemonType) ?? [])
                .map((type) => <span key={type} className="rounded-full bg-sky-500/15 px-3 py-1 text-sm text-sky-200">{typeName(type)}</span>)}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>Nome<input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={fieldClass} /></label>
            <label className={labelClass}>Identificador<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} className={fieldClass} /></label>
            <label className={labelClass}>Variante
              <select value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value })} className={fieldClass}>
                <option value="">Normal</option><option value="Shiny">Shiny</option><option value="Alolan">Alola</option><option value="Galarian">Galar</option><option value="Hisuian">Hisui</option><option value="Paldean">Paldea</option><option value="Other">Outra forma</option>
              </select>
            </label>
            <label className={labelClass}>Tier
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} className={fieldClass}>
                <option value="">Sem tier</option>{TIERS.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
              </select>
            </label>
            <label className={labelClass}>Preço individual (KK) — vazio usa preço do tier<input inputMode="decimal" value={form.priceKk} onChange={(e) => setForm({ ...form, priceKk: e.target.value })} placeholder="Opcional" className={fieldClass} /></label>
            <label className={labelClass}>Preço individual (R$) — vazio usa preço do tier<input inputMode="decimal" value={form.priceBrl} onChange={(e) => setForm({ ...form, priceBrl: e.target.value })} placeholder="Opcional" className={fieldClass} /></label>
            <label className={labelClass}>Número da Pokédex<input type="number" min="1" value={form.pokedexNumber} onChange={(e) => setForm({ ...form, pokedexNumber: e.target.value })} className={fieldClass} /></label>
            <label className={labelClass}>Nível no jogo<input type="number" min="0" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={fieldClass} /></label>
            <label className={labelClass}>Tipo/categoria no jogo<input value={form.gameType} onChange={(e) => setForm({ ...form, gameType: e.target.value })} placeholder="Ex.: Boss, Hunt..." className={fieldClass} /></label>
            <label className={labelClass}>Evolução<input value={form.evolution} onChange={(e) => setForm({ ...form, evolution: e.target.value })} placeholder="Ex.: Togekiss" className={fieldClass} /></label>
            <label className={labelClass}>Item de evolução<input value={form.evolutionItem} onChange={(e) => setForm({ ...form, evolutionItem: e.target.value })} className={fieldClass} /></label>
            <label className={`${labelClass} sm:col-span-2`}>URL da imagem<input type="url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} className={fieldClass} /></label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-200">Tipos ofensivos do jogo (máximo 2)</legend>
            <div className="flex flex-wrap gap-2">
              {POKEMON_TYPES.map((type) => (
                <label key={type} className={`cursor-pointer rounded-full border px-3 py-2 text-sm ${form.offensiveTypes.includes(type) ? "border-sky-400 bg-sky-500/20 text-sky-100" : "border-white/15 text-slate-300"}`}>
                  <input type="checkbox" className="sr-only" checked={form.offensiveTypes.includes(type)} onChange={() => toggleType(type)} />
                  {typeName(type)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-200">Pokélog — quantidade de abates por etapa</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {form.stages.map((stage, index) => (
                <label key={index} className={labelClass}>Etapa {index + 1}
                  <input type="number" min="0" value={stage} onChange={(e) => {
                    const stages: [string, string, string] = [...form.stages] as [string, string, string];
                    stages[index] = e.target.value;
                    setForm({ ...form, stages });
                  }} className={fieldClass} />
                </label>
              ))}
            </div>
          </fieldset>

          <label className={labelClass}>Observações<textarea rows={3} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={fieldClass} /></label>

          <div className="flex flex-wrap gap-3">
            <button disabled={saving} type="submit" className="rounded-lg bg-sky-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{saving ? "Salvando..." : editing ? "Salvar alterações" : "Publicar Pokémon"}</button>
            <button type="button" onClick={newForm} className="rounded-lg border border-white/15 px-5 py-3 text-white">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-8 border-t border-white/10 pt-5">
        <h3 className="mb-3 font-semibold text-white">Pokémon já cadastrados</h3>
        {loading ? <p className="text-sm text-slate-400">Carregando...</p> : rows.length === 0 ? <p className="text-sm text-slate-400">Nenhum Pokémon cadastrado ainda.</p> : (
          <div className="space-y-2">
            {rows.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/50 p-3">
                <div><p className="font-medium text-white">{row.name}</p><p className="text-xs text-slate-400">{row.id} · {row.tier ?? "Sem tier"}{row.pokedex_number ? ` · Pokédex nº ${row.pokedex_number}` : ""}</p></div>
                <button type="button" onClick={() => editPokemon(row)} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white hover:bg-white/10">Editar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
