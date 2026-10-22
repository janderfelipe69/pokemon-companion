import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { Pokemon, PokemonType } from "@/types/pokemon";
import { TypeBadge } from "./TypeBadge";

function TypeRow({ label, types }: { label: string; types: PokemonType[] }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-16 shrink-0 pt-0.5 text-xs text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {types.map((type) => (
          <TypeBadge key={type} type={type} />
        ))}
      </div>
    </div>
  );
}

export function PokemonCard({ pokemon }: { pokemon: Pokemon }) {
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{pokemon.name}</h3>
          {pokemon.isDemo && <Badge>Demo</Badge>}
        </div>
        {pokemon.variant && (
          <div className="mt-1.5">
            <Badge tone="gold">{pokemon.variant}</Badge>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <TypeRow label="Defesa" types={pokemon.defensiveTypes} />
        <TypeRow label="Ataque" types={pokemon.offensiveTypes} />
      </div>
      {pokemon.notes && <p className="border-t border-line pt-3 text-sm text-muted">{pokemon.notes}</p>}
    </Card>
  );
}
