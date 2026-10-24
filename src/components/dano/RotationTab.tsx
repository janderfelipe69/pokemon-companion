"use client";

import { useEffect, useState, type Dispatch } from "react";
import { Copy, Eraser, Plus, Shield, TriangleAlert, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { DexOption, Indexed } from "@/lib/damageTest/search";
import { analyze, highestHazard, MODES } from "@/lib/damageTest/solver";
import { MAX_SLOTS, toMons, type Action, type DamageState, type Slot } from "@/lib/damageTest/state";
import { AttackRune } from "./AttackRune";
import { PokemonCombobox } from "./PokemonCombobox";
import { RotationResults, type RotationResult } from "./RotationResults";
import { btnGhost, btnIcon, btnPrimary, inputClass } from "./ui";

type Props = {
  state: DamageState;
  dispatch: Dispatch<Action>;
  index: readonly Indexed[];
  byId: ReadonlyMap<string, DexOption>;
};

export function RotationTab({ state, dispatch, index, byId }: Props) {
  const team = state.teams[state.cur]!;
  const lookup = (id: string | null) => (id ? (byId.get(id) ?? null) : null);
  const nameOf = (s: Slot) => lookup(s.id)?.name ?? s.name;

  // Resultado do último "Montar rotação", com o que existia na tela naquele momento.
  const [result, setResult] = useState<(RotationResult & { sig: string; cur: number }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  const signature = JSON.stringify([state.cur, state.teams.map((t) => [t.rune, t.slots.map((s) => [s.id ?? s.name, s.dmg, s.lure])])]);
  const shown = result && result.cur === state.cur ? result : null;
  const stale = shown !== null && shown.sig !== signature;
  const filled = team.slots.filter((s) => nameOf(s).trim()).length;

  const run = () => {
    dispatch({ type: "commit", at: Date.now() });
    const analysis = analyze(toMons(team.slots, nameOf), team.rune);
    const compare =
      state.teams.length > 1
        ? state.teams.map((t, i) => ({
            name: t.name,
            current: i === state.cur,
            cells: MODES.map((m) => highestHazard(toMons(t.slots, nameOf), m, t.rune)),
          }))
        : null;
    setResult({ analysis, compare, sig: signature, cur: state.cur });
  };

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="mb-3 text-lg font-semibold">Times</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Escolher time">
          {state.teams.map((t, i) => (
            <button
              key={i}
              type="button"
              aria-pressed={i === state.cur}
              onClick={() => dispatch({ type: "select-team", index: i })}
              className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${i === state.cur ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"}`}
            >
              {t.name || "Sem nome"}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-40 flex-1 text-xs text-muted">
            <span className="mb-1 block">Nome do time</span>
            <input className={`${inputClass} w-full`} value={team.name} maxLength={40} onChange={(e) => dispatch({ type: "rename-team", name: e.target.value })} />
          </label>
          <button type="button" className={btnGhost} onClick={() => dispatch({ type: "new-team" })}>
            <Plus className="size-4" aria-hidden /> Novo time
          </button>
          <button type="button" className={btnGhost} onClick={() => dispatch({ type: "duplicate-team" })}>
            <Copy className="size-4" aria-hidden /> Duplicar
          </button>
          <button
            type="button"
            className={btnGhost}
            disabled={state.teams.length < 2}
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              setConfirmDelete(false);
              dispatch({ type: "delete-team" });
            }}
          >
            {confirmDelete ? "Confirmar exclusão" : "Excluir"}
          </button>
        </div>
        <p className="mt-3 text-sm text-muted">Guarde várias variações de time e troque entre elas. Com mais de um time, o app compara todos no final.</p>
      </Card>

      <AttackRune teamName={team.name} rune={team.rune} dispatch={dispatch} />

      <Card>
        <h2 className="mb-3 flex items-baseline gap-2 text-lg font-semibold">
          Pokémons <span className="text-sm font-normal text-muted">({filled}/{MAX_SLOTS})</span>
        </h2>
        <div className="mb-1 hidden items-center gap-2 px-0.5 text-xs text-muted sm:flex">
          <span className="flex-1">Pokémon (da Pokédex)</span>
          <span className="w-28">Dano (k)</span>
          <span className="w-16 text-center">Lure</span>
          <span className="w-9" />
        </div>
        <ul className="space-y-2">
          {team.slots.map((s, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2 max-sm:border-b max-sm:border-line max-sm:pb-3 sm:flex-nowrap">
              <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
                <PokemonCombobox
                  label={`Pokémon ${i + 1}`}
                  selected={lookup(s.id)}
                  fallbackName={s.name}
                  index={index}
                  onPick={(o) => dispatch({ type: "pick", slot: i, id: o.id, name: o.name })}
                />
              </div>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                aria-label={`Dano de ${nameOf(s) || `Pokémon ${i + 1}`} (em k)`}
                placeholder="Dano (k)"
                className={`${inputClass} w-28`}
                value={s.dmg}
                disabled={!s.id && !s.name}
                onChange={(e) => dispatch({ type: "dmg", slot: i, value: e.target.value })}
                onBlur={() => dispatch({ type: "commit", at: Date.now() })}
              />
              <label className="flex w-16 cursor-pointer items-center justify-center gap-1.5 text-sm text-muted" title="Pokémon que faz o lure (offtank)">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-gold)]"
                  checked={s.lure}
                  onChange={(e) => dispatch({ type: "lure", slot: i, value: e.target.checked })}
                />
                <Shield className="size-4" aria-hidden />
                <span className="sr-only">Faz o lure</span>
              </label>
              <button type="button" className={btnIcon} aria-label={`Remover espaço ${i + 1}`} onClick={() => dispatch({ type: "remove-slot", slot: i })}>
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={btnGhost} disabled={team.slots.length >= MAX_SLOTS} onClick={() => dispatch({ type: "add-slot" })}>
            <Plus className="size-4" aria-hidden /> Adicionar
          </button>
          <button type="button" className={btnGhost} onClick={() => dispatch({ type: "clear-list" })}>
            <Eraser className="size-4" aria-hidden /> Limpar lista
          </button>
          <button type="button" className={btnPrimary} onClick={run}>
            Montar rotação
          </button>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted">
          <p>
            <b className="text-fg">Lure:</b> marque nos pokémons que fazem o lure (offtank). No 3x3 cada time precisa de pelo menos 1 lure (pode ter mais). No 2x2x2
            cada dupla tem 1 lure + 1 normal.
          </p>
          <p>Digite o dano que o jogo mostra para cada pokémon. Os Pokémon e os danos ficam salvos neste navegador: da próxima vez, só atualize os danos.</p>
        </div>
      </Card>

      {shown && stale && (
        <p className="flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3 text-sm" role="status">
          <TriangleAlert className="size-4 shrink-0 text-gold" aria-hidden />
          Você mudou os dados depois do último cálculo. Clique em <b>Montar rotação</b> para atualizar o resultado abaixo.
        </p>
      )}
      {shown && <RotationResults result={shown} lookup={lookup} />}
    </div>
  );
}
