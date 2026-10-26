"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardPaste, MessageSquare, RefreshCw, Send } from "lucide-react";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { BOSS_SCHEDULE_TEXT, isBoostType, ROUND_END_TEXT, type DropStone } from "@/config/guildBoost";
import { groupByType, parseStones, stonesToDrops, summaryText, type PersonWants } from "@/lib/guild/boostStones";
import { planText, planTrades, type Participant } from "@/lib/guild/boostTrades";
import { TradePlanView } from "./TradePlan";

export type DropPost = { name: string; postedAt: string; expiresAt: string; stones: DropStone[] };

type Props = {
  people: PersonWants[] | null;
  posts: DropPost[];
  loading: boolean;
  error: string;
  /** Nick de quem está logado (ou `null`): só quem entrou consegue publicar. */
  me: string | null;
  /** O site tem um webhook do Discord configurado (mostra o botão de atualizar a mensagem). */
  discord: boolean;
  onChanged: () => void;
  onSessionLost: () => void;
};

type Notice = { kind: "ok" | "error"; text: string };

const ghostButton = "rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40";

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Cole o log do drop, veja quem precisa de cada stone e publique para entrar no plano de trocas da rodada. */
export function StoneLog({ people, posts, loading, error, me, discord, onChanged, onSessionLost }: Props) {
  const [text, setText] = useState("");
  const [copyLabel, setCopyLabel] = useState("Copiar resumo");
  const [planCopyLabel, setPlanCopyLabel] = useState("Copiar plano");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [planNotice, setPlanNotice] = useState<Notice | null>(null);

  const stones = useMemo(() => parseStones(text), [text]);
  const groups = useMemo(() => groupByType(stones, people ?? []), [stones, people]);
  const { drops, skipped } = useMemo(() => stonesToDrops(stones), [stones]);

  // Só entra no plano quem publicou (e ainda está na guilda): quem não publicou não recebe nem entrega nada.
  const plan = useMemo(() => {
    const wants = new Map((people ?? []).map((p) => [p.name, p.wants]));
    const participants: Participant[] = posts.filter((post) => wants.has(post.name)).map((post) => ({ name: post.name, stones: post.stones, wants: wants.get(post.name)! }));
    return planTrades(participants);
  }, [people, posts]);
  const expiresByName = useMemo(() => new Map(posts.map((p) => [p.name, p.expiresAt])), [posts]);
  const alreadyPosted = me !== null && posts.some((p) => p.name === me);
  const moved = plan.transfers.reduce((n, t) => n + t.qty, 0);

  async function call(url: string, method: "PUT" | "DELETE" | "POST", body?: unknown) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = await readJson(response);
    if (response.status === 401) {
      onSessionLost();
      throw new Error(String(data.error || "Sua sessão acabou. Entre de novo em Meus boosts."));
    }
    if (!response.ok) throw new Error(String(data.error || "Não foi possível concluir."));
    return data;
  }

  async function send(method: "PUT" | "DELETE") {
    setBusy(true);
    setNotice(null);
    try {
      await call("/api/guild/drops", method, method === "PUT" ? { stones: drops } : undefined);
      if (method === "PUT") setText("");
      setNotice({ kind: "ok", text: method === "PUT" ? `Publicado! Seu drop fica na rodada até as 3h da manhã.` : "Seu drop foi retirado da rodada." });
      onChanged();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao enviar." });
    } finally {
      setBusy(false);
    }
  }

  async function updateDiscord() {
    setBusy(true);
    setPlanNotice(null);
    try {
      const data = await call("/api/guild/discord", "POST");
      setPlanNotice({ kind: "ok", text: data.skipped === "too-soon" ? "O Discord já foi atualizado agora há pouco." : data.skipped === "nothing-to-say" ? "Ainda não há nada para postar no Discord." : "Mensagem do Discord atualizada." });
    } catch (e) {
      setPlanNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao atualizar o Discord." });
    } finally {
      setBusy(false);
    }
  }

  async function paste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip.trim()) setText(clip);
    } catch {
      setNotice({ kind: "error", text: "O navegador não deixou colar sozinho. Clique no campo e use Ctrl+V." });
    }
  }

  async function copyTo(content: string, setLabel: (label: string) => void, idle: string) {
    try {
      await navigator.clipboard.writeText(content);
      setLabel("Copiado!");
    } catch {
      setLabel("Não foi possível copiar");
    }
    setTimeout(() => setLabel(idle), 1800);
  }

  return (
    <div className="@container">
      <div className="grid gap-6 @3xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] @3xl:gap-8">
        {/* ── Coluna 1: o seu drop ─────────────────────────────────────────── */}
        <div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">1. Cole o log do drop do boss</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Cole aqui o log do drop..."
              className="min-h-32 w-full resize-y rounded-lg border border-line bg-raised p-3 font-mono text-xs text-fg placeholder:text-muted/60"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => void paste()} className={`${ghostButton} inline-flex items-center gap-1.5`}>
              <ClipboardPaste className="size-4" aria-hidden /> Colar
            </button>
            <button type="button" onClick={() => setText("")} disabled={!text} className={ghostButton}>
              Limpar
            </button>
            <button type="button" onClick={() => void copyTo(summaryText(groups), setCopyLabel, "Copiar resumo")} disabled={groups.length === 0} className={ghostButton}>
              {copyLabel}
            </button>
            <span className="text-sm text-muted" aria-live="polite">
              {stones.length > 0 ? `${stones.length} ${stones.length === 1 ? "stone encontrada" : "stones encontradas"}` : ""}
            </span>
          </div>

          {drops.length > 0 && (
            <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
              <p className="mb-2 text-sm font-medium">2. Publique para entrar no plano de trocas</p>
              {me ? (
                <>
                  <button type="button" onClick={() => void send("PUT")} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                    <Send className="size-4" aria-hidden /> {busy ? "Publicando..." : "Publicar meus drops"}
                  </button>
                  <p className="mt-2 text-xs text-muted">
                    Você entra como <b className="text-fg">{me}</b> e o drop some sozinho {ROUND_END_TEXT}.
                    {alreadyPosted && " Isso substitui o que você já tinha publicado."}
                    {skipped > 0 && ` ${skipped} ${skipped === 1 ? "linha" : "linhas"} com tipo ou nível desconhecido não ${skipped === 1 ? "entra" : "entram"}.`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">
                  Entre com o seu nick na aba <b className="text-fg">Meus boosts</b> para publicar.
                </p>
              )}
            </div>
          )}

          {notice && (
            <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-3 flex items-start gap-1.5 text-sm ${notice.kind === "error" ? "text-red-300" : "text-teal"}`}>
              {notice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {notice.text}
            </p>
          )}

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}
          {loading && !error && <p className="mt-3 text-sm text-muted">Carregando a lista da guilda...</p>}

          {text.trim() !== "" && groups.length === 0 && <p className="mt-4 text-sm text-muted">Não encontrei nenhuma stone nesse texto. Cole o log do drop exatamente como aparece no jogo.</p>}
          {text.trim() === "" && <p className="mt-4 text-sm text-muted">Cole o log acima para ver quem precisa de cada stone e publicar o seu drop.</p>}

          {groups.length > 0 && (
            <div className="mt-4 grid gap-2.5 @xl:grid-cols-2 @3xl:grid-cols-1">
              {groups.map((g) => (
                <section key={g.typeKey} className="rounded-xl border border-line bg-black/20 p-3">
                  <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
                    {isBoostType(g.typeKey) && <TypeIcon type={g.typeKey} className="size-6" />}
                    {g.type}
                  </h3>
                  <ul>
                    {g.stones.map((s, i) => (
                      <li key={i} className="border-t border-line py-1.5 first:border-t-0 first:pt-0">
                        <div className="flex justify-between gap-2 text-sm">
                          <b className="font-semibold">
                            {s.qty}x {s.tier}
                          </b>
                          <span className="whitespace-nowrap text-muted">
                            +{s.min} a +{s.max} · {s.chance}%
                          </span>
                        </div>
                        {s.names.length > 0 ? (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {s.names.map((name) => (
                              <span key={name} className="rounded-full bg-gold px-2.5 py-0.5 text-xs font-semibold text-ink">
                                {name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1 text-xs text-muted">Ninguém precisa</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* ── Coluna 2: o plano de trocas ──────────────────────────────────── */}
        <section className="border-t border-line pt-5 @3xl:border-l @3xl:border-t-0 @3xl:pl-8 @3xl:pt-0" aria-labelledby="plano-trocas">
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="plano-trocas" className="text-base font-semibold">
              Plano de trocas
            </h3>
            <span className="flex-1" />
            <button type="button" onClick={onChanged} disabled={busy} aria-label="Atualizar plano" title="Atualizar agora" className="rounded-lg border border-line p-2 text-muted hover:text-fg disabled:opacity-40">
              <RefreshCw className="size-4" aria-hidden />
            </button>
            {discord && me && (
              <button type="button" onClick={() => void updateDiscord()} disabled={busy || posts.length === 0} title="Atualiza a mensagem do plano no canal do Discord" className={`${ghostButton} inline-flex items-center gap-1.5`}>
                <MessageSquare className="size-4" aria-hidden /> Atualizar no Discord
              </button>
            )}
            <button type="button" onClick={() => void copyTo(planText(plan), setPlanCopyLabel, "Copiar plano")} disabled={plan.transfers.length === 0} className={ghostButton}>
              {planCopyLabel}
            </button>
          </div>

          {posts.length > 0 && (
            <p className="mt-1 text-sm text-muted">
              <b className="font-semibold text-fg">{posts.length}</b> {posts.length === 1 ? "pessoa publicou" : "pessoas publicaram"} · <b className="font-semibold text-fg">{moved}</b> {moved === 1 ? "stone" : "stones"} a repassar
            </p>
          )}
          <p className="mb-3 mt-1 text-xs text-muted">
            O site cruza o que cada um tem com o que cada um quer e mostra quem entrega o quê para quem. Atualiza sozinho conforme o pessoal publica. Quem não publicou fica de fora, e tudo some {ROUND_END_TEXT}.
          </p>

          {planNotice && (
            <p role={planNotice.kind === "error" ? "alert" : "status"} className={`mb-3 flex items-start gap-1.5 text-sm ${planNotice.kind === "error" ? "text-red-300" : "text-teal"}`}>
              {planNotice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {planNotice.text}
            </p>
          )}

          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-6 text-center">
              <p className="font-medium">Aguardando o próximo boss</p>
              <p className="mt-1 text-sm text-muted">O boss costuma cair {BOSS_SCHEDULE_TEXT}. Assim que alguém publicar o drop, o plano aparece aqui.</p>
            </div>
          ) : (
            <TradePlanView plan={plan} me={me} expiresByName={expiresByName} onRetract={() => void send("DELETE")} busy={busy} />
          )}
        </section>
      </div>
    </div>
  );
}
