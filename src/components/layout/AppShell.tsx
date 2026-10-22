"use client";

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen">
      {/* Menu fixo no desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-panel lg:block">
        <Sidebar />
      </aside>

      {/* Menu em gaveta no celular */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" onClick={close} className="absolute inset-0 bg-black/60" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-line bg-panel">
            <button
              type="button"
              onClick={close}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg"
            >
              <X className="size-5" aria-hidden />
            </button>
            <Sidebar onNavigate={close} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <Header onOpenMenu={() => setOpen(true)} />
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
