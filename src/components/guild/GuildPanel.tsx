"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { normalizeWants, sameWants, STONE_TIERS, type BoostWant } from "@/config/guildBoost";
import { BoostTypePicker } from "./BoostTypePicker";
import { StoneLog, type DropPost } from "./StoneLog";

type Person = { name: string; wants: BoostWant[] };
type Tab = "boosts" | "drops";
type Session = { status: "loading" } | { status: "out" } | { status: "in"; name: string; saved: BoostWant[] };

const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-muted/60";
const NICK_KEY = "guild_nick";


async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function GuildPanel() {
  const [tab, setTab] = useState<Tab>("boosts");
  const [session, setSession] = useState<Session>({ status: "loading" });
  const [draft, setDraft] = useState<BoostWant[]>([]);
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [peopleError, setPeopleError] = useState("");
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [posts, setPosts] = useState<DropPost[]>([]);
  const [discord, setDiscord] = useState(false);

  /** Recarrega a guilda e os drops publicados. `silent` = atualização automática, sem piscar "carregando". */
  const loadPeople = useCallback(async (silent = false) => {
    if (!silent) {
      setPeopleLoading(true);
      setPeopleError("");
    }
    try {
      const [overview, drops] = await Promise.all([fetch("/api/guild/overview", { cache: "no-store" }), fetch("/api/guild/drops", { cache: "no-store" })]);
      const [overviewData, dropsData] = await Promise.all([readJson(overview), readJson(drops)]);
      if (!overview.ok) throw new Error(String(overviewData.error || "Não foi possível carregar a guilda."));
      if (!drops.ok) throw new Error(String(dropsData.error || "Não foi possível carregar os drops publicados."));
      setPeople((overviewData.people as Person[]).map((p) => ({ ...p, wants: normalizeWants(p.wants) })));
      setPosts(dropsData.posts as DropPost[]);
      setDiscord(dropsData.discord === true);
      setPeopleError("");
    } catch (e) {
      if (!silent) setPeopleError(e instanceof Error ? e.message : "Erro ao carregar a guilda.");
    } finally {
      if (!silent) setPeopleLoading(false);
    }
  }, []);

  const enter = (name: string, wants: BoostWant[]) => {
    setSession({ status: "in", name, saved: wants });
    setDraft(wants);
  };

  useEffect(() => {
    let alive = true;
    try {
      setNick(window.localStorage.getItem(NICK_KEY) ?? "");
    } catch {
      /* sem acesso ao armazenamento do navegador: tudo bem */
    }
    fetch("/api/guild/session", { cache: "no-store" })
      .then(async (response) => {
        const data = await readJson(response);
        if (!alive) return;
        const member = data.member as { name: string } | null | undefined;
        if (response.ok && member) enter(member.name, normalizeWants(data.wants));
        else setSession({ status: "out" });
      })
      .catch(() => alive && setSession({ status: "out" }));
    void loadPeople();
    return () => {
      alive = false;
    };
  }, [loadPeople]);

  // A aba de drops sempre mostra os nicks e escolhas mais recentes.
  useEffect(() => {
    if (tab === "drops") void loadPeople();
  }, [tab, loadPeople]);

  // Com a aba de drops aberta, o plano se atualiza sozinho conforme o pessoal publica.
  useEffect(() => {
    if (tab !== "drops") return;
    const id = window.setInterval(() => void loadPeople(true), 30_000);
    return () => window.clearInterval(id);
  }, [tab, loadPeople]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/guild/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nick, password }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível entrar."));
      const member = data.member as { name: string };
      try {
        window.localStorage.setItem(NICK_KEY, member.name);
      } catch {
        /* ok */
      }
      setPassword("");
      setSaved(false);
      enter(member.name, normalizeWants(data.wants));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao entrar.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/guild/session", { method: "DELETE" }).catch(() => undefined);
    setSession({ status: "out" });
    setDraft([]);
    setSaved(false);
    setError("");
  }

  async function save() {
    if (session.status !== "in") return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      const response = await fetch("/api/guild/wants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wants: draft }) });
      const data = await readJson(response);
      if (response.status === 401) {
        setSession({ status: "out" });
        throw new Error(String(data.error || "Sua sessão acabou. Entre de novo."));
      }
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
      const wants = normalizeWants(data.wants);
      setSession({ status: "in", name: session.name, saved: wants });
      setDraft(wants);
      setSaved(true);
      void loadPeople();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  const dirty = session.status === "in" && !sameWants(draft, session.saved);

  return (
    <div className="p-5 pr-14">
      <h2 className="text-xl font-semibold">Boosts da guilda</h2>
      <p className="mt-1 text-sm text-muted">Escolha os tipos de stone que você quer receber do boss e, de cada tipo, quais níveis (Novice a Advanced). Quando o drop é colado, o site mostra quem precisa de cada stone.</p>

      <div role="tablist" aria-label="Seções da guilda" className="mt-4 flex gap-1.5">
        {(
          [
            ["boosts", "Meus boosts"],
            ["drops", "Drops do boss"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "boosts" && (
          <>
            {session.status === "loading" && <p className="text-sm text-muted">Carregando...</p>}

            {session.status === "out" && (
              <form onSubmit={login} className="mx-auto max-w-sm space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Seu nick no jogo</span>
                  <input
                    value={nick}
                    onChange={(e) => setNick(e.target.value)}
                    list="guild-nicks"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoFocus
                    placeholder="Ex.: T R U E"
                    className={inputClass}
                  />
                  <datalist id="guild-nicks">{people?.map((p) => <option key={p.name} value={p.name} />)}</datalist>
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted">Senha</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputClass} />
                </label>
                {error && (
                  <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
                  </p>
                )}
                <button type="submit" disabled={busy || !nick.trim() || !password} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                  {busy ? "Entrando..." : "Entrar"}
                </button>
              </form>
            )}

            {session.status === "in" && (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm">
                    Olá, <b className="font-semibold text-gold">{session.name}</b>! Marque os tipos que você quer receber e escolha os níveis de cada um.
                  </p>
                  <button type="button" onClick={() => void logout()} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-muted hover:text-fg">
                    <LogOut className="size-4" aria-hidden /> Sair
                  </button>
                </div>

                <BoostTypePicker value={draft} onChange={(next) => { setDraft(next); setSaved(false); }} disabled={busy} />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void save()} disabled={busy || !dirty} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                    {busy ? "Salvando..." : "Salvar"}
                  </button>
                  <button type="button" onClick={() => setDraft([])} disabled={busy || draft.length === 0} className="rounded-lg border border-line px-3 py-2.5 text-sm text-muted hover:text-fg disabled:opacity-40">
                    Desmarcar todos
                  </button>
                  <span className="text-sm text-muted">
                    {draft.length} {draft.length === 1 ? "tipo escolhido" : "tipos escolhidos"}
                    {dirty && " · não salvo"}
                  </span>
                </div>
                {saved && !dirty && (
                  <p role="status" className="mt-3 flex items-center gap-1.5 text-sm text-teal">
                    <CheckCircle2 className="size-4" aria-hidden /> Salvo! Você aparece nos drops dos tipos e níveis escolhidos.
                  </p>
                )}
                {error && (
                  <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
                  </p>
                )}
              </>
            )}

            <div className="mt-6 border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-semibold">O que cai no boss</h3>
              <ul className="grid grid-cols-2 gap-1.5 text-xs sm:grid-cols-3">
                {STONE_TIERS.map((t) => (
                  <li key={t.label} className="rounded-md border border-line bg-raised px-2 py-1.5">
                    <b className="font-semibold">{t.label}</b> <span className="text-muted">+{t.min} a +{t.max}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Cada stone vem com o tipo junto. Por exemplo, “Advanced Fire” dá de +26 a +30 de Fire.</p>
            </div>
          </>
        )}

        {tab === "drops" && (
          <StoneLog
            people={people}
            posts={posts}
            loading={peopleLoading}
            error={peopleError}
            me={session.status === "in" ? session.name : null}
            discord={discord}
            onChanged={() => void loadPeople(true)}
            onSessionLost={() => setSession({ status: "out" })}
          />
        )}
      </div>
    </div>
  );
}
