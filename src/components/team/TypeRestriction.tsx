"use client";

import { typeInfo } from "@/config/pokemonTypes";
import type { MonoOption } from "@/lib/teamBuilder";
import type { PokemonType } from "@/types/pokemon";

type Props = {
  options: MonoOption[];
  selected: PokemonType[];
  onChange: (types: PokemonType[]) => void;
};

/** Escolha dos tipos de ataque permitidos no time: 1 tipo = tipo único; vários = só esses tipos; nenhum = livre. */
export function TypeRestriction({ options, selected, onChange }: Props) {
  const toggle = (type: PokemonType) => onChange(selected.includes(type) ? selected.filter((t) => t !== type) : [...selected, type]);
  const mode = selected.length === 0 ? "Qualquer tipo que bata o alvo" : selected.length === 1 ? "Time de tipo único" : `Só ${selected.length} tipos escolhidos`;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Tipos do time <span className="ml-1 font-normal text-muted">· {mode}</span>
        </p>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])} className="text-xs text-muted hover:text-gold">
            Limpar (qualquer tipo)
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Tipos de ataque permitidos">
        {options.map((o) => {
          const active = selected.includes(o.type);
          const { label, color } = typeInfo[o.type];
          return (
            <button
              key={o.type}
              type="button"
              aria-pressed={active}
              disabled={o.count === 0}
              onClick={() => toggle(o.type)}
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
        Marque 1 tipo para um time de tipo único (ex.: só Planta), ou mais de um para misturar (ex.: Dark + Ghost). O número é quantos Pokémon cadastrados atacam com aquele tipo neste tipo de time.
      </p>
    </div>
  );
}
