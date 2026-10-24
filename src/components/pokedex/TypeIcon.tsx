import { Bug, Droplet, Eye, Feather, Flame, Gem, Ghost, HandFist, Leaf, Moon, Mountain, Circle, Settings, Skull, Snowflake, Sparkles, Zap } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { typeInfo } from "@/config/pokemonTypes";
import type { PokemonType } from "@/types/pokemon";

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;

/** A biblioteca de ícones não tem dragão: marcas de garra no mesmo estilo de traço dos demais. */
function DragonClaws(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 21c1-6 3-12 8-18" />
      <path d="M12 21c1-6 3-12 8-18" />
      <path d="M3 14c1-3 2-6 5-9" />
    </svg>
  );
}

const icons: Record<PokemonType, IconComponent> = {
  normal: Circle,
  fire: Flame,
  water: Droplet,
  electric: Zap,
  grass: Leaf,
  ice: Snowflake,
  fighting: HandFist,
  poison: Skull,
  ground: Mountain,
  flying: Feather,
  psychic: Eye,
  bug: Bug,
  rock: Gem,
  ghost: Ghost,
  dragon: DragonClaws,
  dark: Moon,
  steel: Settings,
  fairy: Sparkles,
};

/** Escolhe símbolo claro ou escuro conforme o brilho da cor do tipo (amarelo e gelo pedem símbolo escuro). */
function glyphColor(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#0d1019" : "#ffffff";
}

/** Círculo na cor do tipo com o símbolo dentro. Decorativo: o nome do tipo vem sempre ao lado. */
export function TypeIcon({ type, className = "size-5" }: { type: PokemonType; className?: string }) {
  const Icon = icons[type];
  const { color } = typeInfo[type];
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full ${className}`} style={{ backgroundColor: color, color: glyphColor(color) }} aria-hidden>
      <Icon className="size-[62%]" strokeWidth={2.25} aria-hidden />
    </span>
  );
}
