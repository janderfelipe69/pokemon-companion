"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeWants } from "@/config/guildBoost";
import { PageHeader } from "@/components/ui/PageHeader";
import type { PersonWants } from "@/lib/guild/boostStones";
import { StoneLog, type DropPost } from "./StoneLog";

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** "Drops do boss": cole o log, publique e veja o plano de trocas da rodada (atualiza sozinho a cada 30 s). */
export function DropsView({ me }: { me: string }) {
  const router = useRouter();
  const [people, setPeople] = useState<PersonWants[] | null>(null);
  const [posts, setPosts] = useState<DropPost[]>([]);
  const [discord, setDiscord] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /** `silent` = atualização automática, sem piscar "carregando". */
  const load = useCallback(
    async (silent = false) => {
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
        setPeople((overviewData.people as PersonWants[]).map((p) => ({ ...p, wants: normalizeWants(p.wants) })));
        setPosts(dropsData.posts as DropPost[]);
        setDiscord(dropsData.discord === true);
        setError("");
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : "Erro ao carregar a guilda.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [router],
  );

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <>
      <PageHeader title="Drops do boss" description="Cole o log do drop, veja quem precisa de cada stone e publique para entrar no plano de trocas da rodada." />
      <StoneLog people={people} posts={posts} loading={loading} error={error} me={me} discord={discord} onChanged={() => void load(true)} onSessionLost={() => router.refresh()} />
    </>
  );
}
