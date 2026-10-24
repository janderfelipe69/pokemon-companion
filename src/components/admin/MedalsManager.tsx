"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { MedalBadge } from "@/components/medals/MedalBadge";
import { formatNumber, isIntegerStat, KNOWN_STAT_KEYS, MEDAL_CATEGORIES, MEDAL_STATS, statUnit } from "@/data/medals";
import { getGlobalDex } from "@/lib/globalDex";

type Row = { id: number; name: string; spriteId: string; plus: string; plusValue: string; minus: string; minusValue: string };
type ApiRow = {
  id: number;
  name: string;
  sprite_id: number | null;
  plus_stat: string;
  plus_value: string | number | null;
  minus_stat: string | null;
  minus_value: string | number | null;
};
type Notice = { kind: "ok" | "error"; text: string };

const CUSTOM = "__custom__";
const inputClass =
  "w-full rounded-lg border border-line bg-raised px-2.5 py-2 text-sm text-fg placeholder:text-muted/60 disabled:opacity-40 aria-[invalid=true]:border-red-400";
const VALUE_RE = /^\d{1,6}([.,]\d{1,2})?$/;
const INT_RE = /^\d{1,6}$/;
const valueHint = (stat: string, decimal: string) => (isIntegerStat(stat) ? "Ex.: 5" : decimal);

/** Nome do Pokémon pelo número da Pokédex nacional (só a forma normal), no mesmo formato das medalhas existentes. */
const MEDAL_NAME_OVERRIDES: Record<string, string> = { "nidoran-female": "Nidoran F", "nidoran-male": "Nidoran M" };
let dexNames: Map<number, string> | null = null;
function dexNameOf(dex: number): string | null {
  if (!dexNames) {
    dexNames = new Map();
    for (const e of getGlobalDex()) {
      if (e.variant === null && !dexNames.has(e.dex)) dexNames.set(e.dex, MEDAL_NAME_OVERRIDES[e.id] ?? e.name);
    }
  }
  return dexNames.get(dex) ?? null;
}

const fromValue = (v: string | number | null) => (v == null || v === "" ? "" : formatNumber(Number(v)));

function fromApi(r: ApiRow): Row {
  return {
    id: r.id,
    name: r.name,
    spriteId: r.sprite_id == null || r.sprite_id === r.id ? "" : String(r.sprite_id),
    plus: r.plus_stat,
    plusValue: fromValue(r.plus_value),
    minus: r.minus_stat ?? "",
    minusValue: fromValue(r.minus_value),
  };
}

const FIELDS = ["name", "spriteId", "plus", "plusValue", "minus", "minusValue"] as const;
const isDirty = (a: Row, b: Row | undefined) => !b || FIELDS.some((k) => String(a[k]).trim() !== String(b[k]).trim());

function validate(r: Row): string | null {
  if (!r.name.trim()) return "Informe o nome.";
  if (r.plus.trim().length < 2) return "Escolha o buff.";
  if (r.plusValue.trim() && !VALUE_RE.test(r.plusValue.trim())) return "% do buff inválida (use números, até 2 casas decimais).";
  if (r.plusValue.trim() && isIntegerStat(r.plus.trim()) && !INT_RE.test(r.plusValue.trim())) return "Velocidade do buff é número inteiro (ex.: 5), sem vírgula nem ponto.";
  if (r.minus.trim() && r.minus.trim().length < 2) return "Debuff inválido.";
  if (r.minus.trim() && r.minusValue.trim() && isIntegerStat(r.minus.trim()) && !INT_RE.test(r.minusValue.trim())) return "Velocidade do debuff é número inteiro (ex.: 5), sem vírgula nem ponto.";
  if (r.minus.trim() && r.minusValue.trim() && !VALUE_RE.test(r.minusValue.trim())) return "% do debuff inválida (use números, até 2 casas decimais).";
  if (r.spriteId.trim() && !/^\d{1,5}$/.test(r.spriteId.trim())) return "Número da imagem inválido.";
  return null;
}

const missingValue = (r: Row) => r.plusValue === "" || (r.minus !== "" && r.minusValue === "");

function StatPicker({
  value, onChange, allowNone, customKeys, label,
}: { value: string; onChange: (v: string) => void; allowNone?: boolean; customKeys: string[]; label: string }) {
  const [typing, setTyping] = useState(false);
  const known = KNOWN_STAT_KEYS.some((k) => k === value);
  const selectValue = typing ? CUSTOM : value === "" ? "" : known || customKeys.includes(value) ? value : CUSTOM;
  const showInput = typing || (value !== "" && !known && !customKeys.includes(value));

  return (
    <div className="space-y-1.5">
      <select
        aria-label={label}
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setTyping(true);
            onChange("");
          } else {
            setTyping(false);
            onChange(e.target.value);
          }
        }}
        className={inputClass}
      >
        {allowNone ? <option value="">— sem debuff —</option> : <option value="" disabled>Escolha…</option>}
        {MEDAL_CATEGORIES.map((c) => {
          const keys = KNOWN_STAT_KEYS.filter((k) => MEDAL_STATS[k].category === c.key);
          return (
            <optgroup key={c.key} label={c.label}>
              {keys.map((k) => (
                <option key={k} value={k}>{MEDAL_STATS[k].label}</option>
              ))}
            </optgroup>
          );
        })}
        {customKeys.length > 0 && (
          <optgroup label="Criados por você">
            {customKeys.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </optgroup>
        )}
        <option value={CUSTOM}>Outro (digitar nome)…</option>
      </select>
      {showInput && (
        <input aria-label={`${label}: nome`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Nome do buff, ex.: Exp Boost" className={inputClass} />
      )}
    </div>
  );
}

export function MedalsManager() {
  const [saved, setSaved] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/medals", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as medalhas.");
      const rows = (data.medals as ApiRow[]).map(fromApi);
      setSaved(rows);
      setDraft(rows);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar as medalhas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savedById = useMemo(() => new Map(saved.map((r) => [r.id, r])), [saved]);
  // Buffs "outros" já salvos (não muda enquanto você digita, para o campo não sumir).
  const customKeys = useMemo(
    () => [...new Set(saved.flatMap((r) => [r.plus, r.minus]).filter((k) => k && !KNOWN_STAT_KEYS.some((x) => x === k)))].sort(),
    [saved],
  );
  const dirty = useMemo(() => draft.filter((r) => isDirty(r, savedById.get(r.id))), [draft, savedById]);
  const errors = useMemo(() => new Map(dirty.map((r) => [r.id, validate(r)])), [dirty]);
  const hasErrors = [...errors.values()].some(Boolean);
  const missingCount = useMemo(() => saved.filter(missingValue).length, [saved]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return draft.filter((r) => {
      if (q && !`${r.id} ${r.name}`.toLowerCase().includes(q)) return false;
      // O filtro "faltando %" olha o que já está salvo, para a linha não sumir enquanto você digita.
      if (onlyMissing) {
        const base = savedById.get(r.id);
        if (base && !missingValue(base)) return false;
      }
      return true;
    });
  }, [draft, query, onlyMissing, savedById]);

  const patch = (id: number, change: Partial<Row>) => {
    setNotice(null);
    setDraft((d) => d.map((r) => (r.id === id ? { ...r, ...change } : r)));
  };

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/medals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: dirty.map((r) => ({
            id: r.id,
            name: r.name.trim(),
            spriteId: r.spriteId.trim() || null,
            plus: r.plus.trim(),
            plusValue: r.plusValue.trim() || null,
            minus: r.minus.trim() || null,
            minusValue: r.minus.trim() ? r.minusValue.trim() || null : null,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar.");
      const count = dirty.length;
      await load();
      setNotice({ kind: "ok", text: `${count} ${count === 1 ? "medalha salva" : "medalhas salvas"} com sucesso.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao salvar as medalhas." });
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: Row) {
    if (!savedById.has(row.id)) {
      setDraft((d) => d.filter((r) => r.id !== row.id));
      return;
    }
    if (!window.confirm(`Remover a medalha #${row.id} ${row.name}? Isso apaga a medalha do site.`)) return;
    setNotice(null);
    try {
      const response = await fetch("/api/admin/medals", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível remover.");
      setSaved((s) => s.filter((r) => r.id !== row.id));
      setDraft((d) => d.filter((r) => r.id !== row.id));
      setNotice({ kind: "ok", text: `Medalha #${row.id} removida.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao remover a medalha." });
    }
  }

  const nextId = draft.reduce((max, r) => Math.max(max, r.id), 0) + 1;

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="medals-admin-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="medals-admin-title" className="text-xl font-semibold">Medalhas</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Cada medalha já vem com o buff e o debuff. Preencha só a <strong className="font-medium text-fg">%</strong> de cada um, como aparece no jogo (ex.: 0.2 e 0.3).
            Velocidades (Pokémon, personagem, voo, surf e cavalgar) são número inteiro, sem % (ex.: 5). Para uma medalha nova, use “Adicionar medalha”.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-sm font-medium text-gold hover:bg-gold/20"
        >
          <Plus className="size-4" aria-hidden /> Adicionar medalha
        </button>
      </div>

      {adding && (
        <AddForm
          suggestedId={nextId}
          existingIds={new Set(draft.map((r) => r.id))}
          customKeys={customKeys}
          onAdd={(row) => {
            setDraft((d) => [row, ...d]);
            setAdding(false);
            setQuery("");
            setOnlyMissing(false);
            setNotice({ kind: "ok", text: `Medalha #${row.id} adicionada à lista. Clique em “Salvar alterações” para gravar.` });
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Carregando medalhas...</p>
      ) : loadError ? (
        <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p>{loadError}</p>
            <button type="button" onClick={() => void load()} className="mt-2 underline">Tentar de novo</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1">
              <span className="mb-1.5 block text-sm text-muted">Buscar por nome ou número</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex.: Pikachu ou 25"
                  className="w-full rounded-lg border border-line bg-raised py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-muted"
                />
              </span>
            </label>
            <button
              type="button"
              onClick={() => setOnlyMissing((v) => !v)}
              aria-pressed={onlyMissing}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                onlyMissing ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
              }`}
            >
              Só as que faltam % <span className="opacity-60">{missingCount}</span>
            </button>
          </div>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            {saved.length - missingCount} de {saved.length} com a % preenchida · mostrando {visible.length}
          </p>

          <div
            aria-hidden
            className="mt-4 hidden gap-x-3 px-3 pb-2 text-xs font-medium text-muted lg:grid lg:grid-cols-[3.25rem_minmax(0,1.1fr)_minmax(0,1.4fr)_5.5rem_minmax(0,1.4fr)_5.5rem_2.25rem]"
          >
            <span>#</span>
            <span>Nome</span>
            <span>Buff (+)</span>
            <span>% / valor</span>
            <span>Debuff (−)</span>
            <span>% / valor</span>
            <span />
          </div>

          <ul className="space-y-2">
            {visible.map((r) => {
              const isNew = !savedById.has(r.id);
              const changed = isDirty(r, savedById.get(r.id));
              const error = changed ? errors.get(r.id) : null;
              return (
                <li
                  key={r.id}
                  className={`grid gap-x-3 gap-y-3 rounded-xl border px-3 py-3 lg:grid-cols-[3.25rem_minmax(0,1.1fr)_minmax(0,1.4fr)_5.5rem_minmax(0,1.4fr)_5.5rem_2.25rem] lg:items-start ${
                    changed ? "border-gold/60 bg-gold/5" : "border-line bg-ink/40"
                  }`}
                >
                  <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-1">
                    <MedalBadge spriteId={Number(r.spriteId) || r.id} className="size-10" />
                    <span className="text-xs tabular-nums text-muted">#{r.id}</span>
                    {isNew && <span className="rounded-full bg-teal/15 px-1.5 text-[10px] font-medium text-teal lg:hidden">nova</span>}
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted lg:sr-only">Nome</span>
                    <input aria-label={`#${r.id}: nome`} value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} className={inputClass} />
                    {isNew && <span className="mt-1 hidden text-[10px] font-medium text-teal lg:block">nova — falta salvar</span>}
                  </label>
                  <div>
                    <span className="mb-1 block text-xs text-muted lg:sr-only">Buff</span>
                    <StatPicker label={`#${r.id}: buff`} value={r.plus} onChange={(plus) => patch(r.id, { plus })} customKeys={customKeys} />
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted lg:sr-only">% do buff</span>
                    <span className="relative block">
                      <input
                        inputMode={isIntegerStat(r.plus) ? "numeric" : "decimal"}
                        aria-label={`#${r.id}: valor do buff`}
                        value={r.plusValue}
                        onChange={(e) => patch(r.id, { plusValue: e.target.value })}
                        placeholder="—"
                        aria-invalid={error != null && r.plusValue.trim() !== "" && !VALUE_RE.test(r.plusValue.trim())}
                        className={`${inputClass} ${statUnit(r.plus) ? "pr-7" : ""}`}
                      />
                      {r.plus && statUnit(r.plus) && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>}
                    </span>
                  </label>
                  <div>
                    <span className="mb-1 block text-xs text-muted lg:sr-only">Debuff</span>
                    <StatPicker label={`#${r.id}: debuff`} value={r.minus} onChange={(minus) => patch(r.id, { minus })} allowNone customKeys={customKeys} />
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-xs text-muted lg:sr-only">% do debuff</span>
                    <span className="relative block">
                      <input
                        inputMode={isIntegerStat(r.minus) ? "numeric" : "decimal"}
                        aria-label={`#${r.id}: valor do debuff`}
                        value={r.minusValue}
                        onChange={(e) => patch(r.id, { minusValue: e.target.value })}
                        disabled={!r.minus}
                        placeholder="—"
                        aria-invalid={error != null && r.minusValue.trim() !== "" && !VALUE_RE.test(r.minusValue.trim())}
                        className={`${inputClass} ${r.minus && statUnit(r.minus) ? "pr-7" : ""}`}
                      />
                      {r.minus && statUnit(r.minus) && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => void remove(r)}
                    aria-label={`Remover a medalha #${r.id} ${r.name}`}
                    title="Remover medalha"
                    className="flex size-9 items-center justify-center justify-self-end rounded-lg text-muted hover:bg-red-500/15 hover:text-red-300"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                  {error && (
                    <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300 lg:col-span-full">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {visible.length === 0 && <p className="mt-4 text-sm text-muted">Nenhuma medalha encontrada.</p>}

          <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-raised/95 p-3 shadow-lg shadow-black/40 backdrop-blur">
            <p role="status" className="min-w-0 flex-1 text-sm">
              {notice ? (
                <span className={`flex items-center gap-2 ${notice.kind === "ok" ? "text-teal" : "text-red-300"}`}>
                  {notice.kind === "ok" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <AlertCircle className="size-4 shrink-0" aria-hidden />}
                  {notice.text}
                </span>
              ) : dirty.length > 0 ? (
                <span className="text-muted">
                  {dirty.length} {dirty.length === 1 ? "medalha alterada" : "medalhas alteradas"}, ainda não salva{dirty.length === 1 ? "" : "s"}.
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
              disabled={dirty.length === 0 || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden /> Descartar
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={dirty.length === 0 || hasErrors || saving}
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

function AddForm({
  suggestedId, existingIds, customKeys, onAdd, onCancel,
}: {
  suggestedId: number;
  existingIds: Set<number>;
  customKeys: string[];
  onAdd: (row: Row) => void;
  onCancel: () => void;
}) {
  const [row, setRow] = useState<Row>({ id: suggestedId, name: dexNameOf(suggestedId) ?? "", spriteId: "", plus: "", plusValue: "", minus: "", minusValue: "" });
  const [idText, setIdText] = useState(String(suggestedId));
  // Enquanto você não digitar o nome, ele acompanha o número da Pokédex.
  const [nameTouched, setNameTouched] = useState(false);
  const [error, setError] = useState("");

  const idNumber = Number(idText);
  const spriteNumber = row.spriteId.trim() ? Number(row.spriteId) : idNumber;
  const previewOk = Number.isInteger(spriteNumber) && spriteNumber > 0;
  const dexName = Number.isInteger(idNumber) && idNumber > 0 ? dexNameOf(idNumber) : null;

  function changeId(text: string) {
    setIdText(text);
    setError("");
    if (nameTouched) return;
    const n = Number(text);
    setRow((r) => ({ ...r, name: Number.isInteger(n) && n > 0 ? dexNameOf(n) ?? "" : "" }));
  }

  function submit() {
    const id = Number(idText);
    if (!Number.isInteger(id) || id <= 0) return setError("Informe o número da medalha (inteiro maior que zero).");
    if (existingIds.has(id)) return setError(`Já existe a medalha #${id}. Escolha outro número ou edite a que já existe na lista.`);
    const next = { ...row, id };
    const problem = validate(next);
    if (problem) return setError(problem);
    onAdd({ ...next, name: next.name.trim() });
  }

  return (
    <div className="mt-5 rounded-xl border border-gold/40 bg-gold/5 p-4">
      <h3 className="font-semibold">Nova medalha</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Número da medalha (= nº na Pokédex)</span>
          <span className="flex items-center gap-2">
            {previewOk ? <MedalBadge spriteId={spriteNumber} className="size-9 shrink-0" /> : <span className="size-9 shrink-0" />}
            <input inputMode="numeric" value={idText} onChange={(e) => changeId(e.target.value)} className={inputClass} />
          </span>
          <span className="mt-1 block text-[11px] text-muted">
            {dexName ? <>Pokédex: <strong className="font-medium text-fg">{dexName}</strong></> : idText.trim() ? "Número fora da Pokédex — digite o nome." : ""}
          </span>
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs text-muted">Nome</span>
          <input value={row.name} onChange={(e) => {
              setNameTouched(e.target.value !== "");
              setRow({ ...row, name: e.target.value });
            }}
            placeholder="Preenche sozinho pelo número" className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Nº do Pokémon para a imagem (opcional)</span>
          <input inputMode="numeric" value={row.spriteId} onChange={(e) => setRow({ ...row, spriteId: e.target.value })} placeholder={`igual ao número (${idText || "?"})`} className={inputClass} />
        </label>
        <div>
          <span className="mb-1 block text-xs text-muted">Buff (+)</span>
          <StatPicker label="Novo: buff" value={row.plus} onChange={(plus) => setRow({ ...row, plus })} customKeys={customKeys} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">% / valor do buff</span>
          <input inputMode="decimal" value={row.plusValue} onChange={(e) => setRow({ ...row, plusValue: e.target.value })} placeholder={valueHint(row.plus, "Ex.: 0.2")} className={inputClass} />
        </label>
        <div>
          <span className="mb-1 block text-xs text-muted">Debuff (−)</span>
          <StatPicker label="Novo: debuff" value={row.minus} onChange={(minus) => setRow({ ...row, minus })} allowNone customKeys={customKeys} />
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">% / valor do debuff</span>
          <input inputMode="decimal" value={row.minusValue} onChange={(e) => setRow({ ...row, minusValue: e.target.value })} disabled={!row.minus} placeholder={valueHint(row.minus, "Ex.: 0.3")} className={inputClass} />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={submit} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink hover:opacity-90">
          Adicionar à lista
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-fg">
          Cancelar
        </button>
      </div>
    </div>
  );
}
