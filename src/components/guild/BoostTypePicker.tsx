"use client";

import { Check } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { BOOST_TYPES, DEFAULT_TIERS, STONE_TIERS, TIER_KEYS, normalizeWants, type BoostWant, type StoneTierKey } from "@/config/guildBoost";
import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

const PRESETS: { label: string; tiers: StoneTierKey[] }[] = [
  { label: "Só Advanced", tiers: ["advanced"] },
  { label: "Potent + Advanced", tiers: ["potent", "advanced"] },
  { label: "Todos os níveis", tiers: TIER_KEYS },
];

const sameTiers = (a: readonly StoneTierKey[], b: readonly StoneTierKey[]) => a.length === b.length && a.every((t, i) => t === b[i]);

/**
 * Escolha dos boosts: primeiro os tipos (18 botões de marcar/desmarcar) e, logo abaixo,
 * para cada tipo marcado, quais níveis de stone a pessoa quer (Novice … Advanced).
 */
export function BoostTypePicker({ value, onChange, disabled = false }: { value: BoostWant[]; onChange: (next: BoostWant[]) => void; disabled?: boolean }) {
  const byType = new Map(value.map((w) => [w.type, w]));

  // `normalizeWants` mantém sempre a ordem do jogo, não a ordem dos cliques.
  const toggleType = (type: PokemonType) =>
    onChange(byType.has(type) ? value.filter((w) => w.type !== type) : normalizeWants([...value, { type, tiers: DEFAULT_TIERS }]));

  const toggleTier = (type: PokemonType, tier: StoneTierKey) => {
    const current = byType.get(type);
    if (!current) return;
    const has = current.tiers.includes(tier);
    if (has && current.tiers.length === 1) return; // sempre fica pelo menos um nível; para tirar o tipo, desmarque-o acima
    const tiers = TIER_KEYS.filter((t) => (t === tier ? !has : current.tiers.includes(t)));
    onChange(value.map((w) => (w.type === type ? { type, tiers } : w)));
  };

  const applyToAll = (tiers: StoneTierKey[]) => onChange(value.map((w) => ({ type: w.type, tiers })));

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BOOST_TYPES.map((type) => {
          const on = byType.has(type);
          const { label, color } = typeInfo[type];
          return (
            <button
              key={type}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => toggleType(type)}
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

      {value.length > 0 && (
        <div className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <h3 className="text-sm font-semibold">Quais boosts de cada tipo?</h3>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Aplicar a todos os tipos escolhidos">
              <span className="text-xs text-muted">Todos:</span>
              {PRESETS.map((preset) => {
                const active = value.every((w) => sameTiers(w.tiers, preset.tiers));
                return (
                  <button
                    key={preset.label}
                    type="button"
                    disabled={disabled}
                    aria-pressed={active}
                    onClick={() => applyToAll(preset.tiers)}
                    className={`rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50 ${active ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"}`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">Marque os níveis que você quer. Você só aparece nos drops dos níveis marcados.</p>

          <ul className="mt-2.5 space-y-2">
            {value.map((want) => {
              const { label, color } = typeInfo[want.type];
              return (
                <li key={want.type} className="rounded-xl border border-line bg-black/20 p-2.5" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <TypeIcon type={want.type} className="size-5" />
                    {label}
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Níveis de ${label}`}>
                    {STONE_TIERS.map((tier) => {
                      const on = want.tiers.includes(tier.key);
                      return (
                        <button
                          key={tier.key}
                          type="button"
                          disabled={disabled}
                          aria-pressed={on}
                          title={`${tier.label} ${label}: +${tier.min} a +${tier.max}`}
                          onClick={() => toggleTier(want.type, tier.key)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${on ? "text-fg" : "border-line bg-raised text-muted hover:text-fg"}`}
                          style={on ? { borderColor: color, backgroundColor: `${color}33` } : undefined}
                        >
                          {tier.label}
                        </button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
