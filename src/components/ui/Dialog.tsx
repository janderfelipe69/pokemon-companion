"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** `wide`: janela larga no computador e tela cheia no celular (para painéis com duas colunas). */
  size?: "default" | "wide";
};

const SIZE_CLASS = {
  default: "m-auto max-h-[92vh] w-[min(44rem,calc(100%-1.5rem))]",
  wide: "m-auto max-h-[92vh] w-[min(64rem,calc(100%-1.5rem))] max-sm:m-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:rounded-none max-sm:border-0",
} as const;

/** Janela modal baseada no <dialog> nativo (foco, tecla Esc e fundo escuro já vêm do navegador). */
export function Dialog({ open, onClose, title, children, size = "default" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      // O React repassa o evento "close" de uma janela aninhada para a janela de fora; só reage se foi esta que fechou.
      onClose={(e) => e.target === e.currentTarget && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
      className={`${SIZE_CLASS[size]} overflow-y-auto rounded-xl border border-line bg-panel p-0 text-fg backdrop:bg-black/70`}
    >
      <div className="relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-lg bg-ink/70 text-muted hover:text-fg"
        >
          <X className="size-5" aria-hidden />
        </button>
        {open && children}
      </div>
    </dialog>
  );
}
