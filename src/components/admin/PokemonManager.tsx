"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { entryImageUrl, getGlobalDex, GLOBAL_DEX_IS_PARTIAL } from "@/lib/globalDex";
import { normalize } from "@/lib/pokemonFilters";
import type { GlobalDexEntry } from "@/types/globalDex";
import { GlobalDexBrowser } from "./GlobalDexBrowser";
import { PokemonForm } from "./PokemonForm";
import type { AdminRow } from "./types";

type Tab = "global" | "catalogo";
type Target = { entry: GlobalDexEntry | null; row: AdminRow | null };

const PAGE_SIZE = 50;
const stripShiny = (id: string) => (id.startsWith("shiny-") ? id.slice("shiny-".length) : id);
const rowTitle = (r: AdminRow) => (r.variant ? `${r.variant} ${r.name}` : r.name);

export function PokemonManager() {
  const [tab, setTab] = useState<Tab>("global");
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const dex = useMemo(() => getGlobalDex(), []);
  const dexById = useMemo(() => new Map(dex.map((e) => [e.id, e])), [dex]);
  const registeredIds = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  const loadRows = useCallback(async () => {
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
  }, []);

  useEffect(() => { void loadRows(); }, [loadRows]);

  const filteredRows = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return rows;
    return rows.filter((r) => normalize(rowTitle(r)).includes(q) || r.id.includes(q) || String(r.pokedex_number) === q);
  }, [rows, query]);

  async function handleSaved(text: string) {
    setTarget(null);
    setMessage(text);
    await loadRows();
  }

  const tabClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active ? "bg-raised text-gold" : "text-muted hover:text-fg"}`;

  return (
    <section className="mt-8 rounded-xl border border-line bg-panel p-5">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Cadastro de Pokémon</h2>
        <p className="mt-1 text-sm text-muted">
          Escolha na Pokédex global e adicione ao catálogo do site. Nome, número, tipos, evolução e imagem vêm prontos.
        </p>
      </div>

      <nav aria-label="Cadastro" className="mb-5 flex w-fit gap-1 rounded-lg border border-line bg-ink/40 p-1">
        <button type="button" onClick={() => setTab("global")} aria-current={tab === "global" ? "page" : undefined} className={tabClass(tab === "global")}>
          Pokédex global
        </button>
        <button type="button" onClick={() => setTab("catalogo")} aria-current={tab === "catalogo" ? "page" : undefined} className={tabClass(tab === "catalogo")}>
          Meu catálogo{!loading && ` (${rows.length})`}
        </button>
      </nav>

      {message && <p role="status" className="mb-4 rounded-lg border border-teal/40 bg-teal/10 p-3 text-sm text-teal">{message}</p>}
      {error && <p role="alert" className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

      {tab === "global" ? (
        <>
          {GLOBAL_DEX_IS_PARTIAL && (
            <p className="mb-4 rounded-lg border border-gold/40 bg-gold/5 p-3 text-sm text-muted">
              <strong className="font-medium text-fg">Lista parcial ({dex.length} formas).</strong> Para carregar todos os Pokémon, com
              evoluções, rode <code className="rounded bg-raised px-1.5 py-0.5 text-fg">npm.cmd run dex:global</code> no terminal (uma vez, com internet) e
              reinicie o site.
            </p>
          )}
          <GlobalDexBrowser
            dex={dex}
            registeredIds={registeredIds}
            onPick={(entry) => { setMessage(""); setTarget({ entry, row: null }); }}
          />
        </>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-muted">Buscar no catálogo</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
                placeholder="Ex.: Shiny Absol"
                className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
              />
            </span>
          </label>

          {loading ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-muted">{rows.length === 0 ? "Nenhum Pokémon cadastrado ainda." : "Nada encontrado."}</p>
          ) : (
            <>
              <p className="text-sm text-muted" aria-live="polite">{filteredRows.length} de {rows.length} Pokémon</p>
              <ul className="space-y-2">
                {filteredRows.slice(0, visible).map((row) => {
                  const entry = dexById.get(stripShiny(row.id)) ?? null;
                  const image = entry ? entryImageUrl(entry, row.id.startsWith("shiny-")) : row.image_url;
                  return (
                    <li key={row.id} className="flex items-center gap-3 rounded-lg border border-line bg-ink/40 p-2.5">
                      <div className="w-14 shrink-0 overflow-hidden rounded-md">
                        <PokemonImage key={image ?? row.id} src={image} alt="" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{rowTitle(row)}</p>
                        <p className="text-xs text-muted">
                          {row.pokedex_number ? `#${row.pokedex_number} · ` : ""}{row.tier ?? "Sem tier"}
                        </p>
                      </div>
                      {!entry && <Badge>Fora da global</Badge>}
                      <button
                        type="button"
                        onClick={() => { setMessage(""); setTarget({ entry, row }); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
                      >
                        <Pencil className="size-3.5" aria-hidden />
                        Editar
                      </button>
                    </li>
                  );
                })}
              </ul>
              {visible < filteredRows.length && (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-lg border border-line bg-raised px-5 py-2.5 text-sm font-medium hover:border-gold/50 hover:text-gold"
                  >
                    Mostrar mais
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <Dialog open={target !== null} onClose={() => setTarget(null)} title="Cadastro de Pokémon">
        {target && (
          <PokemonForm
            key={target.row?.id ?? target.entry?.id}
            entry={target.entry}
            row={target.row}
            rows={rows}
            onSaved={handleSaved}
            onClose={() => setTarget(null)}
          />
        )}
      </Dialog>
    </section>
  );
}
