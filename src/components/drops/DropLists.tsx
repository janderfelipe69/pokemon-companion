"use client";

import { useState } from "react";
import { ItemImage } from "@/components/talents/ItemImage";
import { formatChance, formatQuantity, zoneLabel, ZONES, type DropPokemon, type DropRow, type DropsIndex, type ZoneKey } from "@/lib/drops/types";

/** Miniatura do Pokémon (com a inicial se a imagem faltar). */
export function PokemonThumb({ pokemon, className = "size-14" }: { pokemon: DropPokemon; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-raised ${className}`}>
      {pokemon.image && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- fonte externa configurável; evita o otimizador de imagens
        <img
          src={pokemon.image}
          alt={pokemon.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="size-full object-contain p-0.5"
        />
      ) : (
        <span className="text-sm font-bold text-muted" aria-label={`${pokemon.name} (sem imagem)`}>
          {pokemon.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}

/** Chance como no jogo: porcentagem com barra, "Muito Raro" em vermelho ou traço quando não se sabe. */
function ChanceView({ row }: { row: DropRow }) {
  if (row.veryRare) {
    return (
      <div className="w-24 shrink-0 text-right">
        <p className="text-sm font-semibold text-red-300">Muito Raro</p>
        <div className="mt-1 h-1 rounded-full bg-line" aria-hidden>
          <div className="h-full w-[4%] min-w-1 rounded-full bg-red-400" />
        </div>
      </div>
    );
  }
  if (row.chance == null) return <p className="w-24 shrink-0 text-right text-xs text-muted">Chance não informada</p>;
  return (
    <div className="w-24 shrink-0 text-right">
      <p className="text-sm font-semibold tabular-nums">{formatChance(row.chance)}</p>
      <div className="mt-1 h-1 rounded-full bg-line" aria-hidden>
        <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(3, Math.min(100, row.chance))}%` }} />
      </div>
    </div>
  );
}

const rowClass = "flex w-full items-center gap-3 rounded-xl border border-line bg-black/20 p-2.5 text-left transition-colors hover:border-gold/50 hover:bg-white/5";

/** O que um Pokémon dropa, separado por zona. Clicar num item abre quem mais dropa ele. */
export function PokemonDropList({ pokemonId, index, onOpenItem }: { pokemonId: string; index: DropsIndex; onOpenItem: (itemId: number) => void }) {
  const rows = index.byPokemon.get(pokemonId) ?? [];
  const zones = ZONES.filter((z) => rows.some((r) => r.zone === z.key));
  const [picked, setPicked] = useState<ZoneKey | null>(null);
  const zone = picked && zones.some((z) => z.key === picked) ? picked : zones[0]?.key;

  if (rows.length === 0) return <p className="text-sm text-muted">Nenhum drop cadastrado para este Pokémon.</p>;

  return (
    <div>
      {zones.length > 1 && (
        <div role="tablist" aria-label="Zona" className="mb-3 flex gap-1.5">
          {zones.map((z) => (
            <button
              key={z.key}
              type="button"
              role="tab"
              aria-selected={z.key === zone}
              onClick={() => setPicked(z.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                z.key === zone ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
              }`}
            >
              {z.label} <span className="opacity-60">{rows.filter((r) => r.zone === z.key).length}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {rows
          .filter((r) => r.zone === zone)
          .map((row) => {
            const item = index.itemsById.get(row.itemId);
            if (!item) return null;
            const quantity = formatQuantity(row.min, row.max);
            return (
              <li key={`${row.itemId}-${row.zone}`}>
                <button type="button" onClick={() => onOpenItem(row.itemId)} title="Ver quais Pokémon dropam este item" className={rowClass}>
                  <ItemImage path={item.imagePath} name={item.name} className="size-12" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    {quantity && <span className="block text-xs text-muted">Quantidade: {quantity}</span>}
                  </span>
                  <ChanceView row={row} />
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

/** Quais Pokémon dropam um item. Clicar num Pokémon mostra tudo que ele dropa. */
export function ItemDropList({ itemId, index, onOpenPokemon }: { itemId: number; index: DropsIndex; onOpenPokemon: (pokemonId: string) => void }) {
  const rows = index.byItem.get(itemId) ?? [];
  if (rows.length === 0) return <p className="text-sm text-muted">Nenhum Pokémon cadastrado para dropar este item ainda.</p>;

  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const pokemon = index.pokemonById.get(row.pokemonId);
        if (!pokemon) return null;
        const quantity = formatQuantity(row.min, row.max);
        return (
          <li key={`${row.pokemonId}-${row.zone}`}>
            <button type="button" onClick={() => onOpenPokemon(row.pokemonId)} title="Ver tudo que este Pokémon dropa" className={rowClass}>
              <PokemonThumb pokemon={pokemon} className="size-12" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  {pokemon.name}
                  {pokemon.dexNumber != null && <span className="ml-2 text-xs font-normal tabular-nums text-muted">#{pokemon.dexNumber}</span>}
                </span>
                <span className="block text-xs text-muted">
                  {zoneLabel(row.zone)}
                  {quantity && ` · Quantidade: ${quantity}`}
                </span>
              </span>
              <ChanceView row={row} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
