"use client";

import { ChevronRight, Lock } from "lucide-react";
import { bannerFamilies, bannerImage, unlockLabel, type GuildBanner } from "@/config/guildBanners";

type Props = {
  /** Nível da guilda: define quais banners já estão liberados. */
  level: number;
  /** O banner que a guilda usa hoje (salvo). */
  active: string;
  /** Com `onSelect`, os banners liberados viram botões (admin). Sem ele, é só para olhar. */
  selected?: string;
  onSelect?: (id: string) => void;
  disabled?: boolean;
};

function Tile({ banner, level, active, selected, onSelect, disabled }: Props & { banner: GuildBanner }) {
  const locked = level < banner.unlock;
  const isActive = banner.id === active;
  const isPicked = !!onSelect && banner.id === selected && selected !== active;
  const interactive = !!onSelect && !locked && !disabled;

  const body = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
      <img src={bannerImage(banner.id)} alt="" width={64} height={64} loading="lazy" className={`size-16 object-contain transition-transform ${locked ? "opacity-40 grayscale" : interactive ? "group-hover:scale-110" : ""}`} />
      <span className={`text-sm font-semibold ${locked ? "text-muted" : ""}`}>{banner.name}</span>
      {isActive ? (
        <span className="rounded-full bg-gold px-2 py-0.5 text-[11px] font-bold text-ink">Em uso</span>
      ) : isPicked ? (
        <span className="rounded-full bg-teal px-2 py-0.5 text-[11px] font-bold text-ink">Selecionado</span>
      ) : locked ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted"><Lock className="size-3" aria-hidden /> Libera no nível {banner.unlock}</span>
      ) : (
        <span className="text-[11px] text-muted">{unlockLabel(banner)}</span>
      )}
    </>
  );

  const box = `group flex min-w-0 flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-colors ${
    isActive ? "border-gold bg-gold/10 shadow-[0_0_20px_-8px_rgba(242,184,75,0.6)]" : isPicked ? "border-teal bg-teal/10" : "border-line bg-raised"
  }`;

  return interactive ? (
    <button type="button" onClick={() => onSelect?.(banner.id)} aria-pressed={banner.id === selected} className={`${box} hover:border-teal/60`}>{body}</button>
  ) : (
    <div className={box} aria-disabled={locked || undefined}>{body}</div>
  );
}

/** Os banners da guilda, uma linha evolutiva por linha (1ª fase → 2ª fase → última), com o que está liberado, bloqueado e em uso. */
export function BannerPicker(props: Props) {
  return (
    <div className="space-y-3">
      {bannerFamilies().map(({ family, banners }) => (
        <div key={family} className="grid grid-cols-3 items-stretch gap-2 sm:gap-3">
          {banners.map((banner, i) => (
            <div key={banner.id} className="relative min-w-0">
              <Tile banner={banner} {...props} />
              {i < banners.length - 1 && <ChevronRight aria-hidden className="absolute -right-2.5 top-1/2 z-10 hidden size-4 -translate-y-1/2 text-muted sm:block" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
