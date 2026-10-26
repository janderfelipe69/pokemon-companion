"use client";

import { useEffect, useRef } from "react";
import type { BallData } from "@/config/guildBalls";
import { drawBallCard, loadCardAssets, type CardAssets } from "@/lib/guild/ballsImage";

type Props = {
  data: BallData;
  /** Arte enviada à mão (data URL). Sem ela, usa a arte oficial pelo número. */
  sprite?: string | null;
  className?: string;
  onLoaded?: (assets: CardAssets) => void;
};

/** Cartão do projeto desenhado no navegador a partir dos dados (a imagem nunca fica guardada: sempre sai dos números). */
export function BallCardCanvas({ data, sprite = null, className = "", onLoaded }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let alive = true;
    void loadCardAssets(data, sprite).then((assets) => {
      if (!alive || !ref.current) return;
      drawBallCard(data, assets, ref.current);
      onLoadedRef.current?.(assets);
    });
    return () => {
      alive = false;
    };
  }, [data, sprite]);

  return <canvas ref={ref} role="img" aria-label={`Projeto de balls: ${data.pokemon}`} className={`block h-auto w-full rounded-xl ${className}`} />;
}
