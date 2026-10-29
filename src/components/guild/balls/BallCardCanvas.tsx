"use client";

import { useEffect, useRef } from "react";
import type { BallData } from "@/config/guildBalls";
import { drawBallCard, loadCardAssets, type CardAssets, type CardCapture } from "@/lib/guild/ballsImage";

type Props = {
  data: BallData;
  /** Projeto encerrado: mostra o selo "Capturado" e destaca a ball. */
  capture?: CardCapture | null;
  className?: string;
  onLoaded?: (assets: CardAssets) => void;
};

/** Cartão do projeto desenhado no navegador a partir dos dados (a imagem nunca fica guardada: sempre sai dos números). */
export function BallCardCanvas({ data, capture = null, className = "", onLoaded }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let alive = true;
    void loadCardAssets(data).then((assets) => {
      if (!alive || !ref.current) return;
      drawBallCard(data, assets, ref.current, capture);
      onLoadedRef.current?.(assets);
    });
    return () => {
      alive = false;
    };
    // `capture` é um objeto novo a cada render: só importam a ball e a quantidade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, capture?.ball, capture?.spent, capture?.startedAt, capture?.capturedAt]);

  return <canvas ref={ref} role="img" aria-label={`Projeto de balls: ${data.pokemon}`} className={`block h-auto w-full rounded-xl ${className}`} />;
}
