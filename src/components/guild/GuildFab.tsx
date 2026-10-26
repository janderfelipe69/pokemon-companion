"use client";

import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { Gem } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { GuildPanel } from "./GuildPanel";

/** Botão flutuante da guilda (aparece em todas as páginas, menos no admin, onde atrapalharia os botões de salvar). */
export function GuildFab() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);

  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir os boosts da guilda"
        title="Boosts da guilda"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-2 rounded-full border border-gold/60 bg-gold px-4 py-3 text-sm font-semibold text-ink shadow-lg shadow-black/50 transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <Gem className="size-5" aria-hidden />
        <span className="hidden sm:inline">Guilda</span>
      </button>
      <Dialog open={open} onClose={close} title="Boosts da guilda" size="wide">
        <GuildPanel />
      </Dialog>
    </>
  );
}
