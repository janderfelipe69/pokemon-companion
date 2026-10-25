import { Badge } from "@/components/ui/Badge";
import { PokemonImage } from "@/components/pokedex/PokemonImage";
import { TypeBadge } from "@/components/pokedex/TypeBadge";
import { TierLabel } from "@/components/tiers/TierLabel";
import { formatBrlRange, formatKkRange } from "@/lib/money";
import { TEAM_SIZE, type Candidate, type TeamResult } from "@/lib/teamBuilder";
import { EffectBadge } from "./EffectBadge";

export function MemberTile({ member }: { member: Candidate }) {
  const { pokemon: p } = member.entry;
  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-line bg-raised">
      <PokemonImage key={member.entry.image?.src} src={member.entry.image?.src ?? null} alt={p.sourceName ?? p.name} />
      <div className="flex flex-1 flex-col gap-2 p-2.5">
        <p className="text-sm font-semibold leading-snug">{p.sourceName ?? p.name}</p>
        <TierLabel pokemon={p} />
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={member.attackType} />
          <EffectBadge level={member.level} full={member.isFull} />
        </div>
        {member.stars > 0 && (
          <span className="text-sm font-semibold text-gold" title={`Considerando ${member.stars} estrela${member.stars > 1 ? "s" : ""}`} aria-label={`${member.stars} estrelas`}>
            {"★".repeat(member.stars)}
            <span className="ml-1 text-xs font-normal text-muted">{member.stars}★</span>
          </span>
        )}
        {member.isTarget && <Badge tone="teal">O próprio alvo: caça ele mesmo</Badge>}
        {member.wildcard && <Badge tone="muted">Coringa: qualquer tipo</Badge>}
        {member.isFallback && <Badge tone="gold">Reforço</Badge>}
        {(p.priceKk != null || p.priceBrl != null) && (
          <p className="mt-auto text-xs tabular-nums text-muted">
            {p.priceKk != null && formatKkRange(p.priceKk, p.priceKkMax)} {p.priceBrl != null && formatBrlRange(p.priceBrl, p.priceBrlMax)}
          </p>
        )}
      </div>
    </li>
  );
}

export function TeamCard({ team, index }: { team: TeamResult; index: number }) {
  const full = team.members.filter((m) => m.isFull).length;
  const fallback = team.members.filter((m) => m.isFallback).length;
  return (
    <section className="rounded-xl border border-line bg-panel p-4 sm:p-5" aria-label={`Opção ${index + 1}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">Opção {index + 1}</h3>
        <Badge tone="teal">{full} de {team.members.length} com efetividade máxima</Badge>
        {fallback > 0 && <Badge tone="gold">{fallback} de reforço</Badge>}
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {team.members.map((m) => (
          <MemberTile key={m.entry.pokemon.id} member={m} />
        ))}
        {Array.from({ length: Math.max(0, TEAM_SIZE - team.members.length) }, (_, i) => (
          <li key={`empty-${i}`} className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">
            Sem Pokémon efetivo disponível
          </li>
        ))}
      </ul>
    </section>
  );
}
