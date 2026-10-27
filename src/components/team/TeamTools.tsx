"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PokedexEntry } from "@/types/pokedex";
import type { PokemonType } from "@/types/pokemon";
import { huntTargets, parseTypeParam } from "@/lib/typeFinder";
import { TeamBuilder } from "./TeamBuilder";
import { TypeFinder } from "./TypeFinder";

type Tab = "cacar" | "tipo";
const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "cacar", label: "Quero caçar um Pokémon", hint: "Escolha o alvo e receba os times de 6" },
  { id: "tipo", label: "Tenho um tipo", hint: "Escolha o tipo e veja o que ele farma" },
];

/**
 * As duas formas de usar o montador: do alvo para o time, ou do tipo para os alvos.
 * As duas ficam montadas (a inativa só escondida) para não perder o que a pessoa já escolheu ao trocar de aba.
 * A aba e os tipos vão para o endereço (?aba=tipo&tipos=dark,ghost), então dá para mandar o link no Discord.
 */
export function TeamTools({ entries, pools = {} }: { entries: PokedexEntry[]; pools?: Record<string, string[]> }) {
  const [tab, setTab] = useState<Tab>("cacar");
  const [types, setTypes] = useState<PokemonType[]>([]);
  const [jump, setJump] = useState<{ id: string; nonce: number } | null>(null);
  const [ready, setReady] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  const targets = useMemo(() => huntTargets(entries), [entries]);

  // Lê o endereço uma vez, já no navegador (a página é gerada no servidor e não conhece o ?aba=).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("aba") === "tipo") setTab("tipo");
    setTypes(parseTypeParam(params.get("tipos")));
    setReady(true);
  }, []);

  // Mantém o endereço em dia sem criar uma entrada nova no histórico a cada clique.
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (tab === "tipo") url.searchParams.set("aba", "tipo");
    else url.searchParams.delete("aba");
    if (tab === "tipo" && types.length > 0) url.searchParams.set("tipos", types.join(","));
    else url.searchParams.delete("tipos");
    window.history.replaceState(null, "", url);
  }, [ready, tab, types]);

  const pick = (id: string) => {
    setJump((j) => ({ id, nonce: (j?.nonce ?? 0) + 1 }));
    setTab("cacar");
  };

  return (
    <div className="space-y-6">
      <div ref={top} className="scroll-mt-4">
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-xl border border-line bg-raised p-1" role="tablist" aria-label="Como montar o time">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`aba-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`painel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${tab === t.id ? "bg-gold/15 text-gold" : "text-muted hover:text-fg"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{TABS.find((t) => t.id === tab)?.hint}</p>
      </div>

      <div id="painel-cacar" role="tabpanel" aria-labelledby="aba-cacar" hidden={tab !== "cacar"}>
        <TeamBuilder entries={entries} pools={pools} jumpTo={jump} />
      </div>
      <div id="painel-tipo" role="tabpanel" aria-labelledby="aba-tipo" hidden={tab !== "tipo"}>
        <TypeFinder targets={targets} selected={types} onChange={setTypes} onPick={pick} />
      </div>
    </div>
  );
}
