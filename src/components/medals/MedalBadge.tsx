"use client";

import { useState } from "react";
import { medalSpriteUrl } from "@/data/medals";

/** Medalha redonda de bronze com o sprite do Pokémon (como na janela do jogo). */
export function MedalBadge({ id, className = "size-14" }: { id: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`medal-badge ${className}`} aria-hidden>
      {failed ? (
        <span className="text-[10px] font-bold text-white/80">#{id}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- sprite externo pequeno; evita o otimizador de imagens
        <img
          src={medalSpriteUrl(id)}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
