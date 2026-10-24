"use client";

import { typeInfo } from "@/config/pokemonTypes";
import type { MonoOption } from "@/lib/teamBuilder";
import type { PokemonType } from "@/types/pokemon";

export type TypeMode = "mixed" | "single" | "pick";

const MODES: { id: TypeMode; label: string; hint: string }[] = [
  { id: "mixed", label: "Misto", hint: "Qualquer tipo que bata o alvo" },
  { id: "single", label: "Tipo único", hint: "Time todo com 1 só tipo" },
  { id: "pick", label: "Escolher tipos", hint: "Só os tipos que você marcar (ex.: Dark + Ghost)" },
];

type Props = {
  options: MonoOption[];
  mode: TypeMode;
  selected: PokemonType[];
  onMode: (mode: TypeMode) => void;
  onChange: (types: PokemonType[]) => void;
};

/** Escolha dos tipos de ataque do time: misto (livre), tipo único (1 tipo) ou tipos escolhidos (vários). */
export function TypeRestriction({ options, mode, selected, onMode, onChange }: Props) {
  const click = (type: PokemonType) => {
    if (mode === "single") onChange([type]);
    else onChange(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);
  };
  const current = MODES.find((m) => m.id === mode)!;

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-medium">Tipos do time</p>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line bg-raised p-1" role="radiogroup" aria-label="Modo de tipos do time">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => onMode(m.id)}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${mode === m.id ? "bg-gold/15 text-gold" : "text-muted hover:text-fg"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{current.hint}</p>
      </div>

      {mode !== "mixed" && (
        <div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={mode === "single" ? "Escolha 1 tipo" : "Escolha os tipos"}>
            {options.map((o) => {
              const active = selected.includes(o.type);
              const { label, color } = typeInfo[o.type];
              return (
                <button
                  key={o.type}
                  type="button"
                  aria-pressed={active}
                  disabled={o.count === 0}
                  onClick={() => click(o.type)}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={active ? { color, borderColor: color, backgroundColor: `${color}26` } : { borderColor: `${color}55`, color: "var(--color-fg)" }}
                >
                  <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                  {label}
                  <span className="text-xs tabular-nums text-muted">{o.count} · {o.full ? "2x" : "1.5x"}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted">
            O número é quantos Pokémon cadastrados atacam com aquele tipo neste tipo de time.
            {mode === "pick" && selected.length === 0 && " Marque ao menos um tipo; sem nenhum marcado o time fica misto."}
          </p>
        </div>
      )}
    </div>
  );
}
