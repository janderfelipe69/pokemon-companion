"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buildSearchIndex, type DexOption } from "@/lib/damageTest/search";
import { damageReducer, initialState, loadSaved, persist } from "@/lib/damageTest/state";
import { HazardsTab } from "./HazardsTab";
import { LogsTab } from "./LogsTab";
import { RotationTab } from "./RotationTab";
import { RunesTab } from "./RunesTab";

const TABS = [
  { id: "rotation", label: "Rotação" },
  { id: "runes", label: "Runas" },
  { id: "logs", label: "Logs" },
  { id: "hazards", label: "Hazards" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function DamageTest({ options }: { options: DexOption[] }) {
  const [state, dispatch] = useReducer(damageReducer, undefined, initialState);
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [tab, setTab] = useState<TabId>("rotation");

  const index = useMemo(() => buildSearchIndex(options), [options]);
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  // O que foi salvo só existe no navegador: é lido depois da primeira renderização.
  useEffect(() => {
    const saved = loadSaved();
    if (saved) dispatch({ type: "hydrate", state: saved });
    setReady(true);
  }, []);

  // Salva a cada mudança (só depois de carregar, para não apagar o que estava salvo).
  useEffect(() => {
    if (ready) setSaveFailed(!persist(state));
  }, [state, ready]);

  // Registra no histórico quando um dano muda: 2,5 s depois de parar de digitar e ao esconder a aba do navegador.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => dispatch({ type: "commit", at: Date.now() }), 2500);
    return () => clearTimeout(t);
  }, [state.teams, ready]);
  useEffect(() => {
    const onHide = () => document.hidden && dispatch({ type: "commit", at: Date.now() });
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const selectTab = (id: TabId) => {
    if (id === "logs") dispatch({ type: "commit", at: Date.now() });
    setTab(id);
  };

  if (!ready) {
    return (
      <Card>
        <p className="text-sm text-muted" role="status">Carregando seus times salvos…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Seções do Teste de Dano" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => selectTab(t.id)}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${tab === t.id ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {saveFailed && (
        <p className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/5 px-4 py-3 text-sm" role="alert">
          <TriangleAlert className="size-4 shrink-0 text-red-400" aria-hidden />
          Este navegador não deixou salvar seus dados (modo privado ou armazenamento bloqueado). O que você digitar será perdido ao fechar a página.
        </p>
      )}

      {/* Os painéis ficam montados (só escondidos) para não perder o resultado ao trocar de aba. */}
      <div role="tabpanel" id="panel-rotation" aria-labelledby="tab-rotation" hidden={tab !== "rotation"}>
        <RotationTab state={state} dispatch={dispatch} index={index} byId={byId} />
      </div>
      <div role="tabpanel" id="panel-runes" aria-labelledby="tab-runes" hidden={tab !== "runes"}>
        <RunesTab rune={state.rune} dispatch={dispatch} />
      </div>
      <div role="tabpanel" id="panel-logs" aria-labelledby="tab-logs" hidden={tab !== "logs"}>
        <LogsTab logs={state.logs} dispatch={dispatch} />
      </div>
      <div role="tabpanel" id="panel-hazards" aria-labelledby="tab-hazards" hidden={tab !== "hazards"}>
        <HazardsTab />
      </div>
    </div>
  );
}
