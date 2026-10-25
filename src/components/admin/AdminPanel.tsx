"use client";

import { useEffect, useState } from "react";
import { BookOpen, Layers, Medal, Package, PiggyBank, Sparkles, type LucideIcon } from "lucide-react";
import { ItemsManager } from "./ItemsManager";
import { MedalsManager } from "./MedalsManager";
import { PokemonManager } from "./PokemonManager";
import { TalentsManager } from "./TalentsManager";
import { TeamPoolManager } from "./TeamPoolManager";
import { TierPricesManager } from "./TierPricesManager";

type SectionKey = "pokemon" | "tiers" | "medalhas" | "itens" | "talentos" | "times";

const SECTIONS: { key: SectionKey; label: string; description: string; icon: LucideIcon }[] = [
  { key: "pokemon", label: "Pokémon", description: "Cadastro e catálogo do site", icon: BookOpen },
  { key: "tiers", label: "Tiers e valores", description: "Valor de cada tier", icon: Layers },
  { key: "medalhas", label: "Medalhas", description: "Buffs, debuffs e % de cada uma", icon: Medal },
  { key: "itens", label: "Itens", description: "Imagens e nomes dos itens", icon: Package },
  { key: "talentos", label: "Talentos", description: "Itens que cada talento pede", icon: Sparkles },
  { key: "times", label: "Time barato", description: "Pokémon úteis do Montador de times", icon: PiggyBank },
];

const isSection = (v: string): v is SectionKey => SECTIONS.some((s) => s.key === v);

/**
 * Painel do admin: um atalho por área (como na página inicial) e só a área escolhida aparece.
 * As outras continuam montadas, só escondidas, para você não perder o que ainda não salvou ao trocar de aba.
 */
export function AdminPanel() {
  const [active, setActive] = useState<SectionKey>("pokemon");
  // Sobe a cada mudança na aba Itens, para a aba Talentos atualizar a lista de itens sem recarregar a página.
  const [itemsVersion, setItemsVersion] = useState(0);

  // Lembra a aba no endereço (#medalhas), então F5 e links diretos voltam para o mesmo lugar.
  useEffect(() => {
    const fromHash = () => {
      const h = window.location.hash.replace("#", "");
      if (isSection(h)) setActive(h);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);

  function choose(key: SectionKey) {
    setActive(key);
    window.history.replaceState(null, "", `#${key}`);
  }

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Áreas da administração" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ key, label, description, icon: Icon }) => {
          const on = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              id={`admin-tab-${key}`}
              aria-selected={on}
              aria-controls={`admin-panel-${key}`}
              onClick={() => choose(key)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                on ? "border-gold bg-raised ring-1 ring-gold/50" : "border-line bg-panel hover:border-gold/40 hover:bg-raised"
              }`}
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 ${on ? "bg-gold/15 text-gold ring-gold/40" : "bg-gold/10 text-gold/80 ring-gold/20"}`}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className={`block text-base font-semibold ${on ? "text-gold" : ""}`}>{label}</span>
                <span className="block text-sm text-muted">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div id="admin-panel-tiers" role="tabpanel" aria-labelledby="admin-tab-tiers" hidden={active !== "tiers"}>
        <TierPricesManager />
      </div>
      <div id="admin-panel-medalhas" role="tabpanel" aria-labelledby="admin-tab-medalhas" hidden={active !== "medalhas"}>
        <MedalsManager />
      </div>
      <div id="admin-panel-itens" role="tabpanel" aria-labelledby="admin-tab-itens" hidden={active !== "itens"}>
        <ItemsManager onChanged={() => setItemsVersion((v) => v + 1)} />
      </div>
      <div id="admin-panel-talentos" role="tabpanel" aria-labelledby="admin-tab-talentos" hidden={active !== "talentos"}>
        <TalentsManager itemsVersion={itemsVersion} />
      </div>
      <div id="admin-panel-times" role="tabpanel" aria-labelledby="admin-tab-times" hidden={active !== "times"}>
        <TeamPoolManager />
      </div>
      <div id="admin-panel-pokemon" role="tabpanel" aria-labelledby="admin-tab-pokemon" hidden={active !== "pokemon"}>
        <PokemonManager />
      </div>
    </div>
  );
}
