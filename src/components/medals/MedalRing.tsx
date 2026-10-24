"use client";

import { MAX_EQUIPPED, type Medal } from "@/data/medals";
import { MedalBadge } from "./MedalBadge";

const SIZE = 264; // px (diâmetro do anel)
const SLOT = 46; // px (diâmetro de cada medalha)
const RADIUS = (SIZE - SLOT) / 2 - 8;

/** As 10 casas de medalha em círculo, como na janela do jogo. Clique numa medalha para tirá-la. */
export function MedalRing({ equipped, onRemove }: { equipped: Medal[]; onRemove: (id: number) => void }) {
  return (
    <div className="relative mx-auto" style={{ width: SIZE, height: SIZE }}>
      <div className="medal-ring absolute inset-3" aria-hidden />
      {/* Pokébola decorativa no centro */}
      <svg aria-hidden viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 opacity-30">
        <circle cx="50" cy="50" r="46" fill="none" stroke="#9fb4d4" strokeWidth="6" />
        <line x1="4" y1="50" x2="36" y2="50" stroke="#9fb4d4" strokeWidth="6" />
        <line x1="64" y1="50" x2="96" y2="50" stroke="#9fb4d4" strokeWidth="6" />
        <circle cx="50" cy="50" r="14" fill="none" stroke="#9fb4d4" strokeWidth="6" />
      </svg>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg font-semibold tabular-nums text-fg/80">
        {equipped.length}/{MAX_EQUIPPED}
      </span>

      {Array.from({ length: MAX_EQUIPPED }, (_, i) => {
        const angle = (-90 + (360 / MAX_EQUIPPED) * i) * (Math.PI / 180);
        const left = SIZE / 2 + RADIUS * Math.cos(angle) - SLOT / 2;
        const top = SIZE / 2 + RADIUS * Math.sin(angle) - SLOT / 2;
        const medal = equipped[i];
        return medal ? (
          <button
            key={medal.id}
            type="button"
            onClick={() => onRemove(medal.id)}
            aria-label={`Remover ${medal.name} da seleção`}
            title={`Remover ${medal.name}`}
            className="absolute rounded-full transition-transform hover:scale-110"
            style={{ left, top, width: SLOT, height: SLOT }}
          >
            <MedalBadge id={medal.id} className="size-full" />
          </button>
        ) : (
          <span
            key={`empty-${i}`}
            aria-hidden
            className="absolute rounded-full border-2 border-dashed border-sky-400/25 bg-black/20"
            style={{ left, top, width: SLOT, height: SLOT }}
          />
        );
      })}
    </div>
  );
}
