import { GUILD } from "@/config/guild";
import type { GuildEmblem } from "@/lib/guild/guildEmblem";

/** A marca do site: o emblema (ou o banner em uso) da guilda e o nome dela. "Pokémon Companion" fica como o nome do site, pequeno. */
export function Logo({ emblem }: { emblem: GuildEmblem }) {
  return (
    <div className="flex items-center gap-3">
      {emblem.banner ? (
        <span className="relative grid size-11 shrink-0 place-items-center rounded-full border-2 border-gold/80 bg-gradient-to-b from-raised to-ink shadow-lg shadow-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
          <img src={emblem.src} alt="" width={44} height={44} className="size-[86%] object-contain" />
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa
        <img src={emblem.src} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full shadow-lg shadow-black/40" />
      )}
      <div className="min-w-0 leading-tight">
        <p className="whitespace-nowrap bg-gradient-to-r from-gold to-amber-100 bg-clip-text text-[15px] font-bold tracking-tight text-transparent">{GUILD.name}</p>
        <p className="whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.12em] text-muted">Pokémon Companion</p>
      </div>
    </div>
  );
}
