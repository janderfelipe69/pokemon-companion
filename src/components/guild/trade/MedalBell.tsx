"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createPublicClient } from "@/lib/supabase/client";

const POLL_MS = 30_000;

/** Sino da guilda: quantas pessoas têm uma troca nova de medalha com você. Leva direto para as suas medalhas. */
export function MedalBell() {
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/guild/medal-notifications", { cache: "no-store" });
      if (!response.ok) return; // sem sessão ou banco ainda sem a migration: o sino só fica quieto
      const data = (await response.json()) as { unread?: number };
      setUnread(typeof data.unread === "number" ? data.unread : 0);
    } catch {
      /* sem rede: tenta de novo no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    void load();
    const client = createPublicClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const kick = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(), 800); // dá tempo do servidor criar os avisos depois da mudança
    };
    const channel = client
      ?.channel("guild-medal-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_offers" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_medal_offer_wants" }, kick)
      .subscribe();
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("guild-medal-read", kick);
    return () => {
      clearTimeout(timer);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("guild-medal-read", kick);
      if (client && channel) void client.removeChannel(channel);
    };
  }, [load]);

  return (
    <Link
      href="/guilda/troca/medalhas?aba=minhas"
      aria-label={unread > 0 ? `${unread} ${unread === 1 ? "match novo" : "matches novos"} na troca de medalhas` : "Matches da troca de medalhas"}
      title={unread > 0 ? `${unread} ${unread === 1 ? "pessoa com troca nova" : "pessoas com troca nova"}` : "Sem trocas novas"}
      className="relative inline-flex items-center rounded-lg border border-line px-2.5 py-1.5 text-muted hover:text-fg"
    >
      <Bell className={`size-4 ${unread > 0 ? "text-gold" : ""}`} aria-hidden />
      {unread > 0 && <span className="absolute -right-1.5 -top-1.5 grid min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold leading-4 text-ink">{unread > 9 ? "9+" : unread}</span>}
    </Link>
  );
}
