import { Info } from "lucide-react";
import type { WeaknessProfile } from "@/lib/effectiveness";
import type { PokedexEntry } from "@/types/pokedex";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { EffectBadge } from "./EffectBadge";

export function WeaknessPanel({ target, profile }: { target: PokedexEntry; profile: WeaknessProfile }) {
  const { pokemon: p } = target;
  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="w-32 shrink-0 overflow-hidden rounded-xl border border-line sm:w-40">
        <PokemonImage key={target.image?.src} src={target.image?.src ?? null} alt={p.sourceName ?? p.name} />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{p.sourceName ?? p.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-muted">Tipos originais</span>
            {profile.defenders.map((t) => <TypeBadge key={t} type={t} />)}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs text-muted">Tipos de ataque que batem o alvo</p>
          {profile.attacks.length === 0 ? (
            <p className="text-sm text-muted">Nenhum tipo é super efetivo contra este alvo.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {profile.attacks.map((a) => (
                <li key={a.type} className="flex items-center gap-1.5 rounded-lg border border-line bg-raised px-2 py-1.5">
                  <TypeBadge type={a.type} />
                  <EffectBadge level={a.level} full={profile.fullLevels.includes(a.level)} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="flex items-start gap-2 text-sm text-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
          {profile.hasDouble
            ? "Este alvo tem acerto duplo: o time prioriza quem bate 2x e só completa com 1.5x se faltar Pokémon."
            : "Este alvo só toma 1.5x de dano. Como é o máximo possível contra ele, o 1.5x conta como 2x no montador."}
        </p>
      </div>
    </div>
  );
}
