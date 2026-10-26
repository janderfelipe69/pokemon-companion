"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";

/** Faixa no topo da área da guilda: voltar para o hub, quem está logado e o botão de sair. */
export function GuildSessionBar({ name }: { name: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const atHub = pathname === "/guilda";

  async function logout() {
    await fetch("/api/guild/session", { method: "DELETE" }).catch(() => undefined);
    router.refresh(); // o servidor não vê mais o cookie e volta para a tela de entrada
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      {atHub ? (
        <p className="text-sm text-muted">
          Olá, <b className="font-semibold text-gold">{name}</b>!
        </p>
      ) : (
        <Link href="/guilda" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
          <ArrowLeft className="size-4" aria-hidden /> Voltar para a guilda
        </Link>
      )}
      <div className="flex items-center gap-3">
        {!atHub && (
          <span className="text-sm text-muted">
            Logado como <b className="font-semibold text-gold">{name}</b>
          </span>
        )}
        <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-fg">
          <LogOut className="size-4" aria-hidden /> Sair
        </button>
      </div>
    </div>
  );
}
