"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type DialogProps = { open: boolean; onClose: () => void; title: string; children: ReactNode };

/** Janela modal baseada no <dialog> nativo (foco, tecla Esc e fundo escuro já vêm do navegador). */
export function Dialog({ open, onClose, title, children }: DialogProps) {
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
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-auto max-h-[92vh] w-[min(44rem,calc(100%-1.5rem))] overflow-y-auto rounded-xl border border-line bg-panel p-0 text-fg backdrop:bg-black/70"
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
