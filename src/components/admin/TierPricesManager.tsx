"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, RotateCcw } from "lucide-react";
import { tierColors } from "@/config/tiers";
import { compareDecimal, formatBrlRange, formatKkRange, parsePrice, type Currency } from "@/lib/money";
import { TIERS, type Tier } from "@/types/pokemon";

type Fields = { kkMin: string; kkMax: string; brlMin: string; brlMax: string };
type ApiRow = {
  tier_code: string;
  price_kk: string | number | null;
  price_kk_max?: string | number | null;
  price_brl: string | number | null;
  price_brl_max?: string | number | null;
};
type Notice = { kind: "ok" | "error"; text: string };

const EMPTY: Fields = { kkMin: "", kkMax: "", brlMin: "", brlMax: "" };
const inputClass =
  "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm tabular-nums text-fg placeholder:text-muted/60 aria-[invalid=true]:border-red-400";

/** Texto da API (ex.: "20000.0000") -> texto canônico ("20000"). */
function fromApi(value: string | number | null | undefined, currency: Currency): string {
  if (value == null) return "";
  const parsed = parsePrice(String(value), currency);
  return parsed.ok ? (parsed.value ?? "") : "";
}

/** Valida uma linha e devolve os valores canônicos + erros por moeda. */
function check(f: Fields) {
  const errors: { kk?: string; brl?: string } = {};
  const out = { kkMin: null as string | null, kkMax: null as string | null, brlMin: null as string | null, brlMax: null as string | null };

  for (const [cur, minKey, maxKey, label] of [
    ["kk", "kkMin", "kkMax", "KK"],
    ["brl", "brlMin", "brlMax", "R$"],
  ] as const) {
    const min = parsePrice(f[minKey], cur);
    const max = parsePrice(f[maxKey], cur);
    if (!min.ok) errors[cur] = min.error;
    else if (!max.ok) errors[cur] = max.error;
    else {
      if (max.value !== null && min.value === null) errors[cur] = `Preencha o mínimo em ${label} (ou apague o máximo).`;
      else if (max.value !== null && min.value !== null && compareDecimal(max.value, min.value) < 0) {
        errors[cur] = `O máximo em ${label} não pode ser menor que o mínimo.`;
      }
      out[minKey] = min.value;
      out[maxKey] = max.value;
    }
  }
  return { errors, values: out, valid: !errors.kk && !errors.brl };
}

export function TierPricesManager() {
  const [saved, setSaved] = useState<Record<Tier, Fields>>(() => Object.fromEntries(TIERS.map((t) => [t, EMPTY])) as Record<Tier, Fields>);
  const [draft, setDraft] = useState<Record<Tier, Fields>>(saved);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/tier-prices", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar os valores.");

      const next = Object.fromEntries(TIERS.map((t) => [t, EMPTY])) as Record<Tier, Fields>;
      for (const row of data.prices as ApiRow[]) {
        const tier = TIERS.find((t) => t === row.tier_code);
        if (!tier) continue;
        next[tier] = {
          kkMin: fromApi(row.price_kk, "kk"),
          kkMax: fromApi(row.price_kk_max, "kk"),
          brlMin: fromApi(row.price_brl, "brl"),
          brlMax: fromApi(row.price_brl_max, "brl"),
        };
      }
      setSaved(next);
      setDraft(next);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao carregar os valores." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo(
    () =>
      TIERS.map((tier) => {
        const f = draft[tier];
        const dirty = (Object.keys(EMPTY) as (keyof Fields)[]).some((k) => f[k].trim() !== saved[tier][k]);
        return { tier, f, dirty, ...check(f) };
      }),
    [draft, saved],
  );
  const dirtyRows = rows.filter((r) => r.dirty);
  const hasErrors = dirtyRows.some((r) => !r.valid);

  const setField = (tier: Tier, key: keyof Fields, value: string) => {
    setNotice(null);
    setDraft((d) => ({ ...d, [tier]: { ...d[tier], [key]: value } }));
  };

  async function saveAll() {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/tier-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: dirtyRows.map((r) => ({ tierCode: r.tier, ...r.values })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      await load();
      setNotice({ kind: "ok", text: `${dirtyRows.length} ${dirtyRows.length === 1 ? "tier salvo" : "tiers salvos"} com sucesso.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao salvar os valores." });
    } finally {
      setSaving(false);
    }
  }

  const field = (tier: Tier, key: keyof Fields, label: string, invalid: boolean) => (
    <label className="block">
      <span className="mb-1 block text-xs text-muted lg:sr-only">{label}</span>
      <input
        inputMode="decimal"
        value={draft[tier][key]}
        onChange={(e) => setField(tier, key, e.target.value)}
        aria-invalid={invalid}
        aria-label={`${tier}: ${label}`}
        placeholder="—"
        className={inputClass}
      />
    </label>
  );

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="tier-values-title">
      <h2 id="tier-values-title" className="text-xl font-semibold">Valores por tier</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Informe a faixa de cada tier: o <strong className="font-medium text-fg">menor</strong> e o{" "}
        <strong className="font-medium text-fg">maior</strong> valor. Se o valor for fixo, preencha só o mínimo. KK em
        milhões (20000 = 20kkk); reais com vírgula ou ponto. Preços individuais de um Pokémon sempre têm prioridade.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Carregando valores...</p>
      ) : (
        <>
          <div
            aria-hidden
            className="mt-6 hidden gap-x-3 px-3 pb-2 text-xs font-medium text-muted lg:grid lg:grid-cols-[9rem_repeat(4,minmax(0,1fr))_minmax(0,1.5fr)]"
          >
            <span>Tier</span>
            <span>KK mínimo</span>
            <span>KK máximo</span>
            <span>R$ mínimo</span>
            <span>R$ máximo</span>
            <span>Como aparece no site</span>
          </div>

          <ul className="space-y-2">
            {rows.map(({ tier, dirty, errors, valid, values }) => (
              <li
                key={tier}
                className={`grid gap-x-3 gap-y-3 rounded-xl border px-3 py-3 lg:grid-cols-[9rem_repeat(4,minmax(0,1fr))_minmax(0,1.5fr)] lg:items-start ${
                  dirty ? "border-gold/60 bg-gold/5" : "border-line bg-ink/40"
                }`}
              >
                <div className="flex items-center gap-2 lg:pt-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: tierColors[tier] }} aria-hidden />
                  <span className="font-semibold">{tier}</span>
                  {dirty && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[11px] font-medium text-gold">alterado</span>}
                </div>

                <div className="grid grid-cols-2 gap-3 lg:contents">
                  {field(tier, "kkMin", "KK mínimo", !!errors.kk)}
                  {field(tier, "kkMax", "KK máximo", !!errors.kk)}
                  {field(tier, "brlMin", "R$ mínimo", !!errors.brl)}
                  {field(tier, "brlMax", "R$ máximo", !!errors.brl)}
                </div>

                <div className="text-sm lg:pt-2">
                  {valid ? (
                    values.kkMin || values.brlMin ? (
                      <p className="tabular-nums">
                        <span className="font-medium">{formatKkRange(values.kkMin, values.kkMax)}</span>
                        <span className="mx-1.5 text-muted">·</span>
                        <span className="font-medium">{formatBrlRange(values.brlMin, values.brlMax)}</span>
                      </p>
                    ) : (
                      <p className="text-muted">Sem valor definido</p>
                    )
                  ) : (
                    <p role="alert" className="flex items-start gap-1.5 text-red-300">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <span>{errors.kk ?? errors.brl}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-raised/95 p-3 shadow-lg shadow-black/40 backdrop-blur">
            <p role="status" className="min-w-0 flex-1 text-sm">
              {notice ? (
                <span className={`flex items-center gap-2 ${notice.kind === "ok" ? "text-teal" : "text-red-300"}`}>
                  {notice.kind === "ok" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <AlertCircle className="size-4 shrink-0" aria-hidden />}
                  {notice.text}
                </span>
              ) : dirtyRows.length > 0 ? (
                <span className="text-muted">
                  {dirtyRows.length} {dirtyRows.length === 1 ? "tier alterado" : "tiers alterados"}, ainda não salvo.
                </span>
              ) : (
                <span className="text-muted">Nenhuma alteração.</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(saved);
                setNotice(null);
              }}
              disabled={dirtyRows.length === 0 || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden /> Descartar
            </button>
            <button
              type="button"
              onClick={() => void saveAll()}
              disabled={dirtyRows.length === 0 || hasErrors || saving}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
