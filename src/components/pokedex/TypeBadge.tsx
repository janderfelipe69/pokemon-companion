import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

export function TypeBadge({ type }: { type: PokemonType }) {
  const { label, color } = typeInfo[type];
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium"
      style={{ color, borderColor: `${color}66`, backgroundColor: `${color}1a` }}
    >
      {label}
    </span>
  );
}
