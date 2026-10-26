"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { normalizeWants, sameWants, STONE_TIERS, type BoostWant } from "@/config/guildBoost";
import { PageHeader } from "@/components/ui/PageHeader";
import { BoostTypePicker } from "./BoostTypePicker";

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** "Meus boosts": o jogador (já logado) marca os tipos e níveis de stone que quer receber do boss. */
export function BoostsView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<BoostWant[]>([]);
  const [draft, setDraft] = useState<BoostWant[]>([]);
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/guild/session", { cache: "no-store" })
      .then(async (response) => {
        const data = await readJson(response);
        if (!alive) return;
        if (!response.ok || !data.member) return router.refresh(); // sessão acabou: o servidor volta para a tela de entrada
        const wants = normalizeWants(data.wants);
        setSaved(wants);
        setDraft(wants);
      })
      .catch(() => alive && setError("Não foi possível carregar os seus boosts."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [router]);

  async function save() {
    setBusy(true);
    setError("");
    setJustSaved(false);
    try {
      const response = await fetch("/api/guild/wants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ wants: draft }) });
      const data = await readJson(response);
      if (response.status === 401) {
        router.refresh();
        throw new Error(String(data.error || "Sua sessão acabou. Entre de novo."));
      }
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
      const wants = normalizeWants(data.wants);
      setSaved(wants);
      setDraft(wants);
      setJustSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  const dirty = !sameWants(draft, saved);

  return (
    <>
      <PageHeader title="Meus boosts" description="Escolha os tipos de stone que você quer receber do boss e, de cada tipo, quais níveis (Novice a Advanced). Quando o drop é publicado, o site mostra quem precisa de cada stone." />
      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <>
          <BoostTypePicker value={draft} onChange={(next) => { setDraft(next); setJustSaved(false); }} disabled={busy} />

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
          {justSaved && !dirty && (
            <p role="status" className="mt-3 flex items-center gap-1.5 text-sm text-teal">
              <CheckCircle2 className="size-4" aria-hidden /> Salvo! Você aparece nos drops dos tipos e níveis escolhidos.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
            </p>
          )}

          <div className="mt-8 border-t border-line pt-4">
            <h2 className="mb-2 text-sm font-semibold">O que cai no boss</h2>
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
    </>
  );
}
