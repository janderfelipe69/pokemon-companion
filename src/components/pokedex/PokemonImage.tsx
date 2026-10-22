"use client";

import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";

type PokemonImageProps = { src: string | null; alt: string; className?: string };

/** Imagem com carregamento preguiçoso, esqueleto enquanto carrega e fallback se faltar ou falhar. */
export function PokemonImage({ src, alt, className = "" }: PokemonImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "loaded" | "error">(src ? "loading" : "error");

  // Imagem já em cache pode terminar de carregar antes da hidratação.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth > 0 ? "loaded" : "error");
  }, [src]);

  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-raised ${className}`}>
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-line/40" aria-hidden />}
      {state === "error" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted">
          <ImageOff className="size-8" aria-hidden />
          <span className="text-xs">Sem imagem</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- fonte externa configurável; evita o otimizador de imagens
        <img
          ref={ref}
          src={src ?? undefined}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setState("loaded")}
          onError={() => setState("error")}
          className={`absolute inset-0 size-full object-contain p-3 transition-opacity ${state === "loaded" ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </div>
  );
}
