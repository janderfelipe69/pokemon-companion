"use client";

import { useState } from "react";
import { itemImageUrl } from "@/lib/talents/items";

/** Quadradinho escuro com a imagem do item (como no jogo). Sem imagem, mostra a inicial do nome. */
export function ItemImage({ path, name, className = "size-12" }: { path: string | null | undefined; name: string; className?: string }) {
  const [failedPath, setFailedPath] = useState<string | null>(null);
  // Ícones pequenos (ex.: 26 px) ficam com pixels nítidos ao ampliar; imagens grandes (ex.: 104 px) são reduzidas com suavização.
  const [pixelArt, setPixelArt] = useState(false);
  const url = itemImageUrl(path);
  const showImage = url && failedPath !== path;
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-black/50 ${className}`} title={name}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- ícones pequenos do Storage; evita o otimizador de imagens
        <img
          src={url}
          alt={name}
          loading="lazy"
          decoding="async"
          onLoad={(e) => setPixelArt(e.currentTarget.naturalWidth <= 64)}
          onError={() => setFailedPath(path ?? null)}
          className="size-full object-contain p-1"
          style={pixelArt ? { imageRendering: "pixelated" } : undefined}
        />
      ) : (
        <span className="text-xs font-bold text-muted" aria-label={`${name} (sem imagem)`}>
          {name.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
