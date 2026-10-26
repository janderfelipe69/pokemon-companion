"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Lock } from "lucide-react";
import { GUILD } from "@/config/guild";

const NICK_KEY = "guild_nick";
const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-muted/60";

/** Tela de entrada da área da guilda: enquanto o jogador não entrar, é só isso que o servidor devolve. */
export function GuildLogin() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      setNick(window.localStorage.getItem(NICK_KEY) ?? "");
    } catch {
      /* sem acesso ao armazenamento do navegador: tudo bem */
    }
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/guild/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nick, password }) });
      const data = (await response.json().catch(() => ({}))) as { error?: string; member?: { name: string } };
      if (!response.ok || !data.member) throw new Error(data.error || "Não foi possível entrar.");
      try {
        window.localStorage.setItem(NICK_KEY, data.member.name);
      } catch {
        /* ok */
      }
      router.refresh(); // o servidor agora enxerga o cookie e devolve a área da guilda
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao entrar.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-6 text-center sm:pt-14">
      <div className="relative">
        <span aria-hidden className="absolute inset-0 rounded-full bg-gold/25 blur-2xl" />
        {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
        <img src={GUILD.emblem} alt="" width={96} height={96} className="relative size-24 rounded-full shadow-xl shadow-black/40" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">Área da guilda</h1>
      <p className="mt-2 text-sm text-muted">Boosts, trocas e times de clones. Entre com o seu nick do jogo para ver.</p>

      <form onSubmit={login} className="mt-6 w-full space-y-3 rounded-xl border border-line bg-panel p-5 text-left">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Seu nick no jogo</span>
          <input value={nick} onChange={(e) => setNick(e.target.value)} autoComplete="username" autoCapitalize="off" autoFocus placeholder="Ex.: T R U E" className={inputClass} />
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
        <button type="submit" disabled={busy || !nick.trim() || !password} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
          <Lock className="size-4" aria-hidden /> {busy ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
