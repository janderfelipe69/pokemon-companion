"use client";

import { useId, type Dispatch } from "react";
import { Card } from "@/components/ui/Card";
import { fmtNum } from "@/lib/damageTest/format";
import type { Action } from "@/lib/damageTest/state";

/** A runa de Attack tem 10 níveis e cada nível dá +2% de dano. */
export const RUNE_LEVELS = 10;
export const RUNE_STEP = 2;

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/** Desenho da runa (pedra vermelha com uma espada) e o nível em algarismo romano no canto. */
function RuneArt({ level, className = "" }: { level: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const off = level === 0;
  return (
    <svg viewBox="0 0 120 140" className={className} role="img" aria-label={off ? "Runa de ataque sem nível" : `Runa de ataque nível ${level}`}>
      <defs>
        <linearGradient id={`${uid}-stone`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#ff6a5a" />
          <stop offset="0.55" stopColor="#d3262a" />
          <stop offset="1" stopColor="#7c0f1b" />
        </linearGradient>
        <linearGradient id={`${uid}-blade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#c9d3df" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#ff8a70" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ff8a70" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g opacity={off ? 0.4 : 1} style={off ? { filter: "grayscale(0.85)" } : undefined}>
        <ellipse cx="60" cy="130" rx="38" ry="6" fill="#000" opacity="0.35" />
        {/* pedra */}
        <polygon points="60,6 98,22 112,62 100,108 62,134 24,114 8,66 22,26" fill={`url(#${uid}-stone)`} stroke="#3a0b10" strokeWidth="4" strokeLinejoin="round" />
        {/* facetas */}
        <polygon points="60,6 22,26 8,66 44,52" fill="#ff9a86" opacity="0.45" />
        <polygon points="60,6 98,22 112,62 78,50" fill="#ff5a4a" opacity="0.35" />
        <polygon points="8,66 24,114 62,134 56,92 44,52" fill="#5e0b16" opacity="0.28" />
        <polygon points="112,62 100,108 62,134 56,92 78,50" fill="#3a0610" opacity="0.38" />
        <polyline points="60,6 44,52 56,92 62,134" fill="none" stroke="#3a0b10" strokeWidth="1.6" opacity="0.55" strokeLinejoin="round" />
        <polyline points="44,52 8,66" fill="none" stroke="#3a0b10" strokeWidth="1.6" opacity="0.5" />
        <polyline points="78,50 112,62" fill="none" stroke="#3a0b10" strokeWidth="1.6" opacity="0.5" />
        <ellipse cx="60" cy="62" rx="40" ry="44" fill={`url(#${uid}-glow)`} />

        {/* espada */}
        <g transform="rotate(35 60 68)" stroke="#2b0a0e" strokeWidth="2.4" strokeLinejoin="round">
          <polygon points="60,22 68,36 68,84 52,84 52,36" fill={`url(#${uid}-blade)`} />
          <line x1="60" y1="30" x2="60" y2="80" stroke="#9fb0c4" strokeWidth="1.6" />
          <rect x="42" y="84" width="36" height="8" rx="3" fill="#f2b84b" />
          <rect x="55.5" y="92" width="9" height="16" rx="2.5" fill="#7a3b1d" />
          <circle cx="60" cy="112" r="5.5" fill="#f2b84b" />
        </g>
      </g>

      {/* nível */}
      {!off && (
        <g>
          <rect x="64" y="104" width={ROMAN[level].length * 8 + 14} height="22" rx="6" fill="#1b1209" stroke="#f2b84b" strokeWidth="1.6" />
          <text x={64 + (ROMAN[level].length * 8 + 14) / 2} y="119.5" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f2b84b" fontFamily="ui-sans-serif, system-ui, sans-serif">
            {ROMAN[level]}
          </text>
        </g>
      )}
    </svg>
  );
}

export function AttackRune({ teamName, rune, dispatch }: { teamName: string; rune: number; dispatch: Dispatch<Action> }) {
  const level = Math.min(RUNE_LEVELS, Math.max(0, Math.round(rune / RUNE_STEP)));
  const exact = rune === level * RUNE_STEP;
  const pick = (next: number) => dispatch({ type: "rune", value: next * RUNE_STEP });

  const levelClass = (on: boolean) =>
    `flex size-10 items-center justify-center rounded-lg border text-sm font-semibold tabular-nums transition-colors ${
      on ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:border-gold/50 hover:text-fg"
    }`;

  return (
    <Card>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-lg font-semibold">Runa de ataque</h2>
        <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-0.5 text-sm text-gold">
          Time: <b>{teamName || "Sem nome"}</b>
        </span>
      </div>

      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-7">
        <RuneArt level={level} className="size-32 shrink-0 drop-shadow-lg" />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-2xl font-bold tabular-nums">
            Attack <span className={level === 0 ? "text-muted" : "text-gold"}>+{fmtNum(rune)}%</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {level === 0 ? "Sem runa neste time." : `Nível ${level} de ${RUNE_LEVELS}.`} Cada nível dá <b className="text-fg">+{RUNE_STEP}%</b> de dano em{" "}
            <b className="text-fg">todos</b> os pokémons <b className="text-fg">deste time</b>.
          </p>

          <div role="radiogroup" aria-label="Nível da runa de ataque" className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
            <button type="button" role="radio" aria-checked={exact && level === 0} onClick={() => pick(0)} className={`${levelClass(exact && level === 0)} w-auto px-3`}>
              Sem runa
            </button>
            {Array.from({ length: RUNE_LEVELS }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" role="radio" aria-checked={exact && level === n} aria-label={`Nível ${n}: +${n * RUNE_STEP}%`} title={`+${n * RUNE_STEP}%`} onClick={() => pick(n)} className={levelClass(exact && level === n)}>
                {n}
              </button>
            ))}
          </div>

          {!exact && (
            <p className="mt-2 text-xs text-amber-300">
              O valor que estava salvo era {fmtNum(rune)}%. Escolha um nível para usar a regra do jogo ({RUNE_STEP}% por nível).
            </p>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm text-muted">
        Digite o dano dos pokémons <b className="text-fg">sem</b> o bônus da runa. Exemplo: um pokémon de 200k com a runa no nível {level || 5} passa a bater{" "}
        {fmtNum(200 * (1 + ((level || 5) * RUNE_STEP) / 100))}k.
      </p>
    </Card>
  );
}
