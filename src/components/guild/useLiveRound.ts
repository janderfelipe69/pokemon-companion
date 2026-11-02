"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeWants } from "@/config/guildBoost";
import { diffPosts, type ActivityEvent } from "@/lib/guild/boostActivity";
import type { PersonWants } from "@/lib/guild/boostStones";
import type { StoredTransfer } from "@/lib/guild/boostTrades";
import { createPublicClient } from "@/lib/supabase/client";
import type { DropPost } from "./StoneLog";

/** Com o tempo real conectado, o polling vira só uma rede de segurança; sem ele, o site pergunta a cada poucos segundos. */
const POLL_LIVE_MS = 30_000;
const POLL_FALLBACK_MS = 8_000;
/** Várias linhas mudam juntas quando alguém publica (o banco apaga e insere); espera um instante para buscar uma vez só. */
const DEBOUNCE_MS = 350;
const MAX_ACTIVITY = 6;

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/**
 * Mantém a rodada do boss sempre atualizada: escuta o banco (Supabase Realtime) e busca de novo assim que alguém
 * publica, retira ou muda o que quer. Se o tempo real não estiver disponível, faz polling curto. Também atualiza
 * ao voltar para a aba, e guarda um histórico curto de quem entrou ou saiu.
 */
export function useLiveRound() {
  const router = useRouter();
  const [people, setPeople] = useState<PersonWants[] | null>(null);
  const [posts, setPosts] = useState<DropPost[]>([]);
  const [transfers, setTransfers] = useState<StoredTransfer[]>([]);
  const [discord, setDiscord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const previousPosts = useRef<DropPost[] | null>(null);
  const inFlight = useRef(false);
  const queued = useRef(false);

  /** `silent` = atualização automática, sem piscar "carregando". */
  const load = useCallback(
    async (silent = false) => {
      if (inFlight.current) {
        queued.current = true; // chegou novidade no meio de uma busca: busca de novo logo depois
        return;
      }
      inFlight.current = true;
      if (!silent) {
        setLoading(true);
        setError("");
      }
      try {
        const [overview, drops] = await Promise.all([fetch("/api/guild/overview", { cache: "no-store" }), fetch("/api/guild/drops", { cache: "no-store" })]);
        if (overview.status === 401 || drops.status === 401) return router.refresh();
        const [overviewData, dropsData] = await Promise.all([readJson(overview), readJson(drops)]);
        if (!overview.ok) throw new Error(String(overviewData.error || "Não foi possível carregar a guilda."));
        if (!drops.ok) throw new Error(String(dropsData.error || "Não foi possível carregar os drops publicados."));

        const nextPosts = dropsData.posts as DropPost[];
        const events = diffPosts(previousPosts.current, nextPosts);
        previousPosts.current = nextPosts;
        if (events.length > 0) setActivity((old) => [...events, ...old].slice(0, MAX_ACTIVITY));

        setPeople((overviewData.people as PersonWants[]).map((p) => ({ ...p, wants: normalizeWants(p.wants) })));
        setPosts(nextPosts);
        setTransfers((dropsData.transfers as StoredTransfer[]) ?? []);
        setDiscord(dropsData.discord === true);
        setLastSync(Date.now());
        setError("");
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : "Erro ao carregar a guilda.");
      } finally {
        inFlight.current = false;
        if (!silent) setLoading(false);
        if (queued.current) {
          queued.current = false;
          void load(true);
        }
      }
    },
    [router],
  );

  // Primeira carga.
  useEffect(() => {
    void load();
  }, [load]);

  // Tempo real: qualquer mudança nas tabelas da rodada dispara uma busca.
  useEffect(() => {
    const client = createPublicClient();
    if (!client) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const kick = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void load(true), DEBOUNCE_MS);
    };
    const channel = client
      .channel("guild-boost-round")
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_boost_drops" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_boost_wants" }, kick)
      .on("postgres_changes", { event: "*", schema: "public", table: "guild_boost_transfers" }, kick)
      .subscribe((status) => {
        const connected = status === "SUBSCRIBED";
        setLive(connected);
        if (connected) void load(true); // o que mudou enquanto conectava
      });
    return () => {
      clearTimeout(timer);
      setLive(false);
      void client.removeChannel(channel);
    };
  }, [load]);

  // Rede de segurança + volta para a aba: só roda com a aba visível.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const id = window.setInterval(tick, live ? POLL_LIVE_MS : POLL_FALLBACK_MS);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [load, live]);

  return { people, posts, transfers, discord, loading, error, live, lastSync, activity, refresh: () => void load(true) };
}
