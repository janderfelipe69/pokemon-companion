import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";
import { TypeIcon } from "./TypeIcon";

export function TypeBadge({ type }: { type: PokemonType }) {
  const { label, color } = typeInfo[type];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2.5 text-xs font-medium"
      style={{ color: "var(--color-fg)", borderColor: `${color}80`, backgroundColor: `${color}1f` }}
    >
      <TypeIcon type={type} className="size-5" />
      {label}
    </span>
  );
}
