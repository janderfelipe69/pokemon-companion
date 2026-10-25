"use client";

import { Check } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { BOOST_TYPES } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

/** Os 18 tipos como botões de marcar/desmarcar. */
export function BoostTypePicker({ value, onChange, disabled = false }: { value: PokemonType[]; onChange: (next: PokemonType[]) => void; disabled?: boolean }) {
  const chosen = new Set(value);
  // Mantém sempre a mesma ordem dos tipos, não a ordem dos cliques.
  const toggle = (type: PokemonType) => onChange(BOOST_TYPES.filter((t) => (t === type ? !chosen.has(t) : chosen.has(t))));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {BOOST_TYPES.map((type) => {
        const on = chosen.has(type);
        const { label, color } = typeInfo[type];
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => toggle(type)}
            className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left text-sm font-medium transition-colors disabled:opacity-50 ${
              on ? "text-fg" : "border-line bg-raised text-muted hover:text-fg"
            }`}
            style={on ? { borderColor: color, backgroundColor: `${color}26` } : undefined}
          >
            <TypeIcon type={type} className="size-7" />
            <span className="flex-1">{label}</span>
            {on && <Check className="size-4 shrink-0" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
