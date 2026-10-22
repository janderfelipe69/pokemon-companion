import type { PokemonType } from "@/types/pokemon";
import { TypeBadge } from "./TypeBadge";

type TypeGroupProps = { title: string; types: PokemonType[] | null; emptyText: string };

/** Grupo de tipos com título explícito (tipos originais x tipos ofensivos das skills). */
export function TypeGroup({ title, types, emptyText }: TypeGroupProps) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-muted">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {types && types.length > 0 ? (
          types.map((type) => <TypeBadge key={type} type={type} />)
        ) : (
          <span className="text-xs text-muted">{emptyText}</span>
        )}
      </div>
    </div>
  );
}

export const ORIGINAL_TITLE = "Tipos originais";
export const OFFENSIVE_TITLE = "Tipos ofensivos das skills";
export const ORIGINAL_EMPTY = "Indisponível";
export const OFFENSIVE_EMPTY = "Não definido";
