import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { TierLabel } from "@/components/tiers/TierLabel";
import { formatBrl, formatKk } from "@/lib/money";
import type { PokedexEntry } from "@/types/pokedex";
import { PokemonImage } from "./PokemonImage";
import { OFFENSIVE_EMPTY, OFFENSIVE_TITLE, ORIGINAL_EMPTY, ORIGINAL_TITLE, TypeGroup } from "./TypeGroup";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs text-muted">{title}</h3>
      {children}
    </section>
  );
}

/** Ficha do Pokémon. Para novas informações, basta adicionar outra <Section>. */
export function PokemonDetail({ entry }: { entry: PokedexEntry }) {
  const { pokemon: p } = entry;

  const pending = [
    entry.originalTypes === null && "Tipagem original indisponível.",
    entry.offensiveTypes.length === 0 && "Tipo ofensivo não definido na lista.",
    p.tier == null && "Tier não definido na lista.",
    entry.image === null && "Sem imagem disponível para esta forma.",
  ].filter((m): m is string => Boolean(m));

  return (
    <div className="grid gap-0 sm:grid-cols-[minmax(0,18rem)_1fr]">
      <PokemonImage key={entry.image?.src} src={entry.image?.src ?? null} alt={p.sourceName ?? p.name} className="sm:h-full sm:min-h-72" />
      <div className="space-y-5 p-5 pr-14 sm:pr-5">
        <div>
          <h2 className="text-xl font-semibold leading-snug">{p.sourceName ?? p.name}</h2>
          <p className="mt-1 text-sm text-muted">
            Espécie: {p.name} · Variante: {p.variant ?? "Normal"}
            {entry.dexNumber != null && ` · Pokédex nacional nº ${entry.dexNumber}`}
          </p>
        </div>
        <TypeGroup title={ORIGINAL_TITLE} types={entry.originalTypes} emptyText={ORIGINAL_EMPTY} />
        <TypeGroup title={OFFENSIVE_TITLE} types={entry.offensiveTypes} emptyText={OFFENSIVE_EMPTY} />
        <Section title="Tier">
          <TierLabel pokemon={p} />
        </Section>
        <div className="grid grid-cols-2 gap-4">
          <Section title="Preço em KK">
            <p className="text-sm font-medium tabular-nums">{formatKk(p.priceKk)}</p>
          </Section>
          <Section title="Preço em R$">
            <p className="text-sm font-medium tabular-nums">{formatBrl(p.priceBrl)}</p>
          </Section>
        </div>
        {(p.evolution || p.evolutionItem) && (
          <div className="grid grid-cols-2 gap-4">
            {p.evolution && (
              <Section title="Evolução">
                <p className="text-sm font-medium">{p.evolution}</p>
              </Section>
            )}
            {p.evolutionItem && (
              <Section title="Item de evolução">
                <p className="text-sm font-medium">{p.evolutionItem}</p>
              </Section>
            )}
          </div>
        )}
        {p.notes && (
          <Section title="Observações">
            <p className="text-sm">{p.notes}</p>
          </Section>
        )}
        {pending.length > 0 && (
          <Section title="Pendências de cadastro">
            <ul className="space-y-1">
              {pending.map((m) => (
                <li key={m}>
                  <Badge>{m}</Badge>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </div>
  );
}
