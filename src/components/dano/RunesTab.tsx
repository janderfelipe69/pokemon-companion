"use client";

import type { Dispatch } from "react";
import { Card } from "@/components/ui/Card";
import { fmtNum } from "@/lib/damageTest/format";
import { MAX_RUNE, type Action } from "@/lib/damageTest/state";
import { inputClass } from "./ui";

export function RunesTab({ rune, dispatch }: { rune: number; dispatch: Dispatch<Action> }) {
  const set = (value: number) => dispatch({ type: "rune", value });
  return (
    <Card>
      <h2 className="text-lg font-semibold">Runas: % extra de dano</h2>
      <p className="mt-1 text-sm text-muted">
        Bônus de dano das runas, aplicado em <b className="text-fg">todos</b> os pokémons (de 0% a {MAX_RUNE}%). Digite o dano dos pokémons{" "}
        <b className="text-fg">sem</b> esse bônus.
      </p>
      <p className="mt-4 text-3xl font-bold tabular-nums">+{fmtNum(rune)}%</p>
      <input
        type="range"
        min={0}
        max={MAX_RUNE}
        step={1}
        value={rune}
        aria-label="Bônus de runas em porcentagem"
        onChange={(e) => set(Number(e.target.value))}
        className="my-4 w-full accent-[var(--color-gold)]"
      />
      <label className="block w-32 text-xs text-muted">
        <span className="mb-1 block">Valor exato (%)</span>
        <input type="number" min={0} max={MAX_RUNE} step={0.5} className={`${inputClass} w-full`} value={rune} onChange={(e) => set(Number(e.target.value))} />
      </label>
      <p className="mt-3 text-sm text-muted">Exemplo: um pokémon de 200k passa a bater {fmtNum(200 * (1 + rune / 100))}k.</p>
    </Card>
  );
}
