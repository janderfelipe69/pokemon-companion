"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Clock, Crown, Users } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { CLONE_DIFFICULTIES, CLONE_NOTE_MAX, CLONE_RESET_TEXT, CLONE_TEAM_SIZE, cloneDifficulty, type CloneDifficultyKey, type CloneTeam } from "@/config/guildClones";

type State = { me: string; myTeamId: number | null; teams: CloneTeam[]; discord: boolean };
type Notice = { kind: "ok" | "error"; text: string };

const tone: Record<CloneDifficultyKey, "teal" | "gold" | "muted"> = { easy: "teal", medium: "gold", hard: "muted" };
const accent: Record<CloneDifficultyKey, string> = {
  easy: "border-teal/50 bg-teal/10 text-teal",
  medium: "border-gold/50 bg-gold/10 text-gold",
  hard: "border-red-400/50 bg-red-400/10 text-red-300",
};
const ghostButton = "rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40";

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function Roster({ team }: { team: CloneTeam }) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-1.5 text-sm">
      {Array.from({ length: CLONE_TEAM_SIZE }, (_, i) => {
        const name = team.members[i];
        return (
          <li key={i} className={`flex items-center gap-1.5 truncate rounded-md border px-2 py-1.5 ${name ? "border-line bg-raised" : "border-dashed border-line text-muted/70"}`}>
            {name ? (
              <>
                {name === team.leader && <Crown className="size-3.5 shrink-0 text-gold" aria-label="Líder" />}
                <span className="truncate">{name}</span>
              </>
            ) : (
              "vaga aberta"
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Times para a missão de clones: o líder cria, a galera entra até fechar 4, e o Discord é avisado a cada passo. */
export function ClonesView() {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [loadError, setLoadError] = useState("");
  const [difficulty, setDifficulty] = useState<CloneDifficultyKey>("medium");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/guild/clones", { cache: "no-store" });
      if (response.status === 401) return router.refresh();
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os times."));
      setState({ me: String(data.me), myTeamId: (data.myTeamId as number | null) ?? null, teams: data.teams as CloneTeam[], discord: data.discord === true });
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar os times.");
    }
  }, [router]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/guild/clones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await readJson(response);
      if (response.status === 401) router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível concluir."));
      setNotice({ kind: "ok", text: success });
      if (body.action === "create") setNote("");
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao enviar." });
    } finally {
      await load();
      setBusy(false);
    }
  }

  const mine = state?.teams.find((t) => t.id === state.myTeamId) ?? null;
  const open = state?.teams.filter((t) => !t.full && t.id !== state.myTeamId) ?? [];
  const closed = state?.teams.filter((t) => t.full && t.id !== state.myTeamId) ?? [];

  return (
    <>
      <PageHeader title="Times de clones" description="Monte time de 4 para a missão de clones. Quem cria o time aparece no Discord da guilda; o pessoal entra aqui até fechar, e o horário vocês combinam entre si." />

      <Card className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {CLONE_DIFFICULTIES.map((d) => (
          <span key={d.key}>
            <Badge tone={tone[d.key]}>{d.label}</Badge> <span className="text-muted">lvl {d.level}</span>
          </span>
        ))}
        <span className="text-muted">· Missão só 1 vez por mês por jogador · reseta {CLONE_RESET_TEXT}</span>
      </Card>

      {notice && (
        <p role={notice.kind === "error" ? "alert" : "status"} className={`mb-4 flex items-start gap-1.5 text-sm ${notice.kind === "error" ? "text-red-300" : "text-teal"}`}>
          {notice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {notice.text}
        </p>
      )}
      {loadError && !state && <p role="alert" className="text-sm text-red-300">{loadError}</p>}
      {!state && !loadError && <p className="text-sm text-muted">Carregando...</p>}

      {state && (
        <div className="space-y-8">
          {mine ? (
            <section aria-labelledby="meu-time">
              <h2 id="meu-time" className="mb-3 text-xl font-semibold tracking-tight">Seu time</h2>
              <Card className={mine.full ? "border-teal/50" : "border-gold/40"}>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone[mine.difficulty]}>{cloneDifficulty(mine.difficulty).label} · lvl {cloneDifficulty(mine.difficulty).level}</Badge>
                  <span className="text-sm font-medium">{mine.members.length}/{CLONE_TEAM_SIZE}</span>
                  {mine.full ? <Badge tone="teal">Time fechado</Badge> : <span className="text-sm text-muted">esperando entrar mais gente...</span>}
                </div>
                {mine.note && <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Clock className="size-4" aria-hidden /> {mine.note}</p>}
                <Roster team={mine} />
                {mine.full && <p className="mt-3 text-sm text-teal">Time completo! Combinem o horário no Discord.</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void act({ action: "leave", teamId: mine.id }, "Você saiu do time.")} className={ghostButton}>
                    Sair do time
                  </button>
                  {mine.leader === state.me && (
                    <button type="button" disabled={busy} onClick={() => { if (window.confirm("Cancelar o time? Todo mundo sai dele.")) void act({ action: "cancel", teamId: mine.id }, "Time cancelado."); }} className={`${ghostButton} hover:!text-red-300`}>
                      Cancelar time
                    </button>
                  )}
                </div>
              </Card>
            </section>
          ) : (
            <section aria-labelledby="novo-time">
              <h2 id="novo-time" className="mb-3 text-xl font-semibold tracking-tight">Procurar time</h2>
              <Card>
                <p className="mb-3 text-sm text-muted">Escolha a dificuldade. {state.discord ? "Vai aparecer uma mensagem no Discord avisando que você procura time." : "O Discord ainda não está configurado no site, então não vai aparecer mensagem lá."}</p>
                <div role="radiogroup" aria-label="Dificuldade" className="grid gap-2 sm:grid-cols-3">
                  {CLONE_DIFFICULTIES.map((d) => (
                    <button key={d.key} type="button" role="radio" aria-checked={difficulty === d.key} onClick={() => setDifficulty(d.key)} className={`rounded-lg border px-4 py-3 text-left transition-colors ${difficulty === d.key ? accent[d.key] : "border-line bg-raised text-muted hover:text-fg"}`}>
                      <span className="block text-base font-semibold">{d.label}</span>
                      <span className="text-sm">lvl {d.level}</span>
                    </button>
                  ))}
                </div>
                <label className="mt-4 block">
                  <span className="mb-1 block text-xs text-muted">Horário que prefere (opcional)</span>
                  <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={CLONE_NOTE_MAX} placeholder="Ex.: hoje à noite, depois das 20h" className="w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-muted/60" />
                </label>
                <button type="button" disabled={busy} onClick={() => void act({ action: "create", difficulty, note }, "Time criado! Agora é esperar o pessoal entrar.")} className="mt-4 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                  {busy ? "Criando..." : "Procurar time"}
                </button>
              </Card>
            </section>
          )}

          <section aria-labelledby="times-abertos">
            <h2 id="times-abertos" className="mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight">
              <Users className="size-5 text-muted" aria-hidden /> Times procurando gente
            </h2>
            {open.length === 0 ? (
              <p className="text-sm text-muted">Nenhum time aberto agora.{!mine && " Crie o primeiro acima!"}</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {open.map((team) => (
                  <Card key={team.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tone[team.difficulty]}>{cloneDifficulty(team.difficulty).label} · lvl {cloneDifficulty(team.difficulty).level}</Badge>
                      <span className="text-sm font-medium">{team.members.length}/{CLONE_TEAM_SIZE}</span>
                    </div>
                    {team.note && <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Clock className="size-4" aria-hidden /> {team.note}</p>}
                    <Roster team={team} />
                    <button type="button" disabled={busy || !!mine} onClick={() => void act({ action: "join", teamId: team.id }, "Você entrou no time!")} className="mt-4 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                      Entrar no time
                    </button>
                    {mine && <p className="mt-2 text-xs text-muted">Você já está em um time neste mês.</p>}
                  </Card>
                ))}
              </div>
            )}
          </section>

          {closed.length > 0 && (
            <section aria-labelledby="times-fechados">
              <h2 id="times-fechados" className="mb-3 text-xl font-semibold tracking-tight">Times fechados neste mês</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {closed.map((team) => (
                  <Card key={team.id} className="opacity-80">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={tone[team.difficulty]}>{cloneDifficulty(team.difficulty).label} · lvl {cloneDifficulty(team.difficulty).level}</Badge>
                      <Badge tone="teal">Fechado</Badge>
                    </div>
                    <Roster team={team} />
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
