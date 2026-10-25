"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ItemImage } from "@/components/talents/ItemImage";
import { indexDrops, type DropsClientData } from "@/lib/drops/types";
import { ItemDropList, PokemonDropList, PokemonThumb } from "./DropLists";
import type { DropsNav } from "./useDropsNav";

/**
 * Janela única que navega entre os dois lados: item -> Pokémon que dropam; Pokémon -> itens que dropam.
 * O botão Voltar desfaz os cliques, e fechar sai de tudo.
 */
export function DropsDialog({ data, nav }: { data: DropsClientData; nav: DropsNav }) {
  const index = useMemo(() => indexDrops(data), [data]);
  const { view } = nav;

  const item = view?.kind === "item" ? index.itemsById.get(view.id) : undefined;
  const pokemon = view?.kind === "pokemon" ? index.pokemonById.get(view.id) : undefined;
  const title = item?.name ?? pokemon?.name ?? "Drops";

  return (
    <Dialog open={view !== null} onClose={nav.close} title={title}>
      {view && (
        <div className="p-5 pr-14">
          {nav.canBack && (
            <button type="button" onClick={nav.back} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
              <ArrowLeft className="size-4" aria-hidden /> Voltar
            </button>
          )}

          {view.kind === "item" && item && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <ItemImage path={item.imagePath} name={item.name} className="size-16" />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">{item.name}</h2>
                  <p className="text-sm text-muted">
                    {(() => {
                      const n = new Set((index.byItem.get(item.id) ?? []).map((r) => r.pokemonId)).size;
                      return n === 0 ? "Nenhum Pokémon dropa este item (ainda)" : `Dropa de ${n} ${n === 1 ? "Pokémon" : "Pokémon"}`;
                    })()}
                  </p>
                </div>
              </div>
              <ItemDropList itemId={item.id} index={index} onOpenPokemon={(id) => nav.go({ kind: "pokemon", id })} />
            </>
          )}

          {view.kind === "pokemon" && pokemon && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <PokemonThumb pokemon={pokemon} className="size-16" />
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold">{pokemon.name}</h2>
                  {pokemon.dexNumber != null && <p className="text-sm tabular-nums text-muted">Pokédex nº {pokemon.dexNumber}</p>}
                </div>
              </div>
              <PokemonDropList pokemonId={pokemon.id} index={index} onOpenItem={(id) => nav.go({ kind: "item", id })} />
            </>
          )}

          {((view.kind === "item" && !item) || (view.kind === "pokemon" && !pokemon)) && <p className="text-sm text-muted">Não encontrei esse registro.</p>}
        </div>
      )}
    </Dialog>
  );
}
