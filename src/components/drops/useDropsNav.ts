"use client";

import { useCallback, useState } from "react";
import type { DropsView } from "@/lib/drops/types";

/** Navegação da janela de drops: abrir, ir de item para Pokémon (e vice-versa), voltar e fechar. */
export function useDropsNav() {
  const [stack, setStack] = useState<DropsView[]>([]);
  const open = useCallback((view: DropsView) => setStack([view]), []);
  const go = useCallback((view: DropsView) => setStack((s) => [...s, view]), []);
  const back = useCallback(() => setStack((s) => s.slice(0, -1)), []);
  const close = useCallback(() => setStack([]), []);
  return { view: stack[stack.length - 1] ?? null, canBack: stack.length > 1, open, go, back, close };
}

export type DropsNav = ReturnType<typeof useDropsNav>;
