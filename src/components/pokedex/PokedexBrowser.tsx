"use client";

import { useMemo, useState } from "react";
import { SearchX, Search } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { filterPokemon, type PokemonFilters } from "@/lib/pokemonFilters";
import type { Pokemon } from "@/types/pokemon";
import { PokemonCard } from "./PokemonCard";
import { TypeSelect } from "./TypeSelect";

const emptyFilters: PokemonFilters = { query: "", defensiveType: "", offensiveType: "" };

export function PokedexBrowser({ pokemon }: { pokemon: Pokemon[] }) {
  const [filters, setFilters] = useState<PokemonFilters>(emptyFilters);
  const results = useMemo(() => filterPokemon(pokemon, filters), [pokemon, filters]);
  const hasFilters = filters.query !== "" || filters.defensiveType !== "" || filters.offensiveType !== "";

  const clearButton = (
    <button
      type="button"
      onClick={() => setFilters(emptyFilters)}
      className="rounded-lg border border-line bg-raised px-4 py-2 text-sm font-medium hover:border-gold/50 hover:text-gold"
    >
      Limpar busca e filtros
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-xl border border-line bg-panel p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1.5 block text-sm text-muted">Buscar por nome</span>
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              placeholder="Digite o nome do Pokémon"
              className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
            />
          </span>
        </label>
        <TypeSelect
          label="Tipo defensivo"
          value={filters.defensiveType}
          onChange={(defensiveType) => setFilters({ ...filters, defensiveType })}
        />
        <TypeSelect
          label="Tipo ofensivo"
          value={filters.offensiveType}
          onChange={(offensiveType) => setFilters({ ...filters, offensiveType })}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {results.length} de {pokemon.length} Pokémon
        </p>
        {hasFilters && results.length > 0 && clearButton}
      </div>

      {results.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((p) => (
            <PokemonCard key={p.id} pokemon={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Nenhum Pokémon encontrado"
          description="Nada corresponde à busca e aos filtros atuais. Tente outro nome ou remova algum filtro."
          action={clearButton}
        />
      )}
    </div>
  );
}
