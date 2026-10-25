"use client";

import { useMemo, useState } from "react";
import { TalentsBrowser } from "@/components/talents/TalentsBrowser";
import type { PublicTalentCategory } from "@/lib/supabase/talents";
import { indexDrops, type DropsClientData } from "@/lib/drops/types";
import { DropsDialog } from "./DropsDialog";
import { ItemsBrowser } from "./ItemsBrowser";
import { useDropsNav } from "./useDropsNav";

type Tab = "talentos" | "itens";
const TABS: { key: Tab; label: string }[] = [
  { key: "talentos", label: "Talentos" },
  { key: "itens", label: "Itens e drops" },
];

/** Página Drops: talentos com seus itens, e a lista de itens com quem dropa. Todo item é clicável. */
export function DropsHub({ categories, data, talentsMessage }: { categories: PublicTalentCategory[]; data: DropsClientData; talentsMessage: string | null }) {
  const [tab, setTab] = useState<Tab>("talentos");
  const nav = useDropsNav();
  const index = useMemo(() => indexDrops(data), [data]);
  const pokemonCount = useMemo(() => {
    const out = new Map<number, number>();
    for (const [itemId, rows] of index.byItem) out.set(itemId, new Set(rows.map((r) => r.pokemonId)).size);
    return out;
  }, [index]);

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Seções" className="flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`drops-tab-${t.key}`}
            aria-selected={tab === t.key}
            aria-controls={`drops-panel-${t.key}`}
            onClick={() => setTab(t.key)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === t.key ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div id="drops-panel-talentos" role="tabpanel" aria-labelledby="drops-tab-talentos" hidden={tab !== "talentos"}>
        {talentsMessage ? (
          <p className="rounded-xl border border-line bg-panel p-5 text-sm text-muted">{talentsMessage}</p>
        ) : (
          <TalentsBrowser categories={categories} pokemonCountByItem={pokemonCount} onOpenItem={(id) => nav.open({ kind: "item", id })} />
        )}
      </div>
      <div id="drops-panel-itens" role="tabpanel" aria-labelledby="drops-tab-itens" hidden={tab !== "itens"}>
        <ItemsBrowser data={data} onOpenItem={(id) => nav.open({ kind: "item", id })} />
      </div>

      <DropsDialog data={data} nav={nav} />
    </div>
  );
}
