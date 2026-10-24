import type { EffectLevel } from "@/lib/effectiveness";

/** Selo de efetividade. "2x" = acerto duplo (ou o máximo possível contra o alvo); "1.5x" = reserva. */
export function EffectBadge({ level, full = true }: { level: EffectLevel; full?: boolean }) {
  const label = level === "x2" || full ? "2x" : "1.5x";
  const style = level === "x2" || full ? "border-teal/40 bg-teal/10 text-teal" : "border-gold/40 bg-gold/10 text-gold";
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums ${style}`}>{label}</span>;
}
