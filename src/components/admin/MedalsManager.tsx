"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Plus, RotateCcw, Search, Trash2, X } from "lucide-react";
import { MedalBadge } from "@/components/medals/MedalBadge";
import { formatAmount, formatNumber, isIntegerStat, KNOWN_STAT_KEYS, MEDAL_CATEGORIES, MEDAL_STATS, statLabel, statUnit, type MedalStatKey } from "@/data/medals";
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

type Filter = "all" | "missing" | "changed";

/** "Defense Boost +0.2%" — ou null quando o valor ainda não foi preenchido. */
function amountText(stat: string, raw: string, sign: "+" | "−"): string | null {
  const n = Number(raw.trim().replace(",", "."));
  if (!raw.trim() || !Number.isFinite(n)) return null;
  return `${statLabel(stat as MedalStatKey)} ${formatAmount(stat as MedalStatKey, n, sign)}`;
}

function Overlay({ title, onClose, children }: { title: React.ReactNode; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-panel p-5 shadow-2xl shadow-black/60 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">{title}</div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AdminTile({ row, changed, isNew, onOpen }: { row: Row; changed: boolean; isNew: boolean; onOpen: () => void }) {
  const plusText = amountText(row.plus, row.plusValue, "+");
  const minusText = row.minus ? amountText(row.minus, row.minusValue, "−") : null;
  const incomplete = !plusText || (row.minus !== "" && !minusText);
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Clique para editar"
      className={`relative flex flex-col items-center gap-2 rounded-xl border bg-black/25 px-2 pb-3 pt-3 text-center transition-colors hover:bg-white/5 ${
        changed ? "border-gold ring-1 ring-gold/60" : incomplete ? "border-amber-500/50" : "border-line"
      }`}
    >
      <span className="absolute left-2 top-1.5 text-[10px] tabular-nums text-muted">#{row.id}</span>
      {(changed || isNew) && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-gold/20 px-1.5 text-[9px] font-semibold text-gold">{isNew ? "nova" : "editada"}</span>
      )}
      <MedalBadge spriteId={Number(row.spriteId) || row.id} className="mt-2 size-14" />
      <span className="text-sm font-semibold leading-tight">{row.name || "(sem nome)"}</span>
      <div className="flex w-full flex-col items-center gap-1">
        {plusText ? (
          <span className="rounded-full bg-emerald-600/90 px-2 py-0.5 text-[11px] font-semibold leading-tight text-white">{plusText}</span>
        ) : (
          <span className="rounded-full border border-dashed border-amber-400/70 px-2 py-0.5 text-[11px] font-semibold leading-tight text-amber-200">
            {statLabel(row.plus as MedalStatKey)} · falta %
          </span>
        )}
        {row.minus ? (
          minusText ? (
            <span className="rounded-full bg-red-600/90 px-2 py-0.5 text-[11px] font-semibold leading-tight text-white">{minusText}</span>
          ) : (
            <span className="rounded-full border border-dashed border-amber-400/70 px-2 py-0.5 text-[11px] font-semibold leading-tight text-amber-200">
              {statLabel(row.minus as MedalStatKey)} · falta %
            </span>
          )
        ) : (
          <span className="rounded-full bg-slate-600/80 px-2 py-0.5 text-[11px] font-semibold leading-tight text-slate-100">sem debuff</span>
        )}
      </div>
    </button>
  );
}

function ValueInput({ stat, value, onChange, label, disabled, invalid }: { stat: string; value: string; onChange: (v: string) => void; label: string; disabled?: boolean; invalid?: boolean }) {
  return (
    <span className="relative block">
      <input
        inputMode={isIntegerStat(stat) ? "numeric" : "decimal"}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={valueHint(stat, "Ex.: 0.2")}
        aria-invalid={invalid}
        className={`${inputClass} ${stat && statUnit(stat) ? "pr-7" : ""}`}
      />
      {stat && statUnit(stat) && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>}
    </span>
  );
}

function MedalEditor({
  row, changed, isNew, error, customKeys, position, onPatch, onPrev, onNext, onRevert, onRemove, onClose,
}: {
  row: Row;
  changed: boolean;
  isNew: boolean;
  error: string | null;
  customKeys: string[];
  position: { index: number; total: number } | null;
  onPatch: (change: Partial<Row>) => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onRevert: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  return (
    <Overlay
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <MedalBadge spriteId={Number(row.spriteId) || row.id} className="size-14 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs tabular-nums text-muted">Medalha #{row.id}{isNew ? " · nova, falta salvar" : ""}</p>
            <h3 className="truncate text-lg font-semibold">{row.name || "(sem nome)"}</h3>
          </div>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Nome</span>
          <input aria-label={`#${row.id}: nome`} value={row.name} onChange={(e) => onPatch({ name: e.target.value })} className={inputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted">Nº do Pokémon da imagem (opcional)</span>
          <input inputMode="numeric" value={row.spriteId} onChange={(e) => onPatch({ spriteId: e.target.value })} placeholder={`igual ao número (${row.id})`} className={inputClass} />
        </label>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-emerald-300">Buff (+)</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <StatPicker label={`#${row.id}: buff`} value={row.plus} onChange={(plus) => onPatch({ plus })} customKeys={customKeys} />
            <ValueInput stat={row.plus} value={row.plusValue} onChange={(plusValue) => onPatch({ plusValue })} label={`#${row.id}: valor do buff`} invalid={error != null && row.plusValue.trim() !== "" && !VALUE_RE.test(row.plusValue.trim())} />
          </div>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 sm:col-span-2">
          <p className="mb-2 text-sm font-semibold text-red-300">Debuff (−)</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7rem]">
            <StatPicker label={`#${row.id}: debuff`} value={row.minus} onChange={(minus) => onPatch({ minus })} allowNone customKeys={customKeys} />
            <ValueInput stat={row.minus} value={row.minusValue} onChange={(minusValue) => onPatch({ minusValue })} label={`#${row.id}: valor do debuff`} disabled={!row.minus} invalid={error != null && row.minusValue.trim() !== "" && !VALUE_RE.test(row.minusValue.trim())} />
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => onPrev?.()} disabled={!onPrev} aria-label="Medalha anterior" className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-sm text-muted hover:text-fg disabled:opacity-30">
          <ChevronLeft className="size-4" aria-hidden /> Anterior
        </button>
        <button type="button" onClick={() => onNext?.()} disabled={!onNext} aria-label="Próxima medalha" className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-2 text-sm text-muted hover:text-fg disabled:opacity-30">
          Próxima <ChevronRight className="size-4" aria-hidden />
        </button>
        {position && <span className="text-xs tabular-nums text-muted">{position.index} / {position.total}</span>}
        <span className="flex-1" />
        {changed && !isNew && (
          <button type="button" onClick={onRevert} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg">
            <RotateCcw className="size-4" aria-hidden /> Desfazer
          </button>
        )}
        <button type="button" onClick={onRemove} aria-label={`Remover a medalha #${row.id} ${row.name}`} title="Remover medalha" className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-red-500/15 hover:text-red-300">
          <Trash2 className="size-4" aria-hidden />
        </button>
        <button type="button" onClick={onClose} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink hover:opacity-90">
          Pronto
        </button>
      </div>
      <p className="mt-3 text-xs text-muted">As mudanças ficam marcadas em dourado na grade. Clique em “Salvar alterações” (barra no rodapé) para gravar de verdade.</p>
    </Overlay>
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
  const [filter, setFilter] = useState<Filter>("all");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

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
  const dirtyIds = useMemo(() => new Set(dirty.map((r) => r.id)), [dirty]);
  const errors = useMemo(() => new Map(dirty.map((r) => [r.id, validate(r)])), [dirty]);
  const hasErrors = [...errors.values()].some(Boolean);
  const missingCount = useMemo(() => saved.filter(missingValue).length, [saved]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return draft.filter((r) => {
      if (q && !`${r.id} ${r.name}`.toLowerCase().includes(q)) return false;
      // "Faltando %" olha o que já está salvo, para o card não sumir enquanto você digita.
      if (filter === "missing") {
        const base = savedById.get(r.id);
        if (base && !missingValue(base)) return false;
      }
      if (filter === "changed" && !dirtyIds.has(r.id)) return false;
      return true;
    });
  }, [draft, query, filter, savedById, dirtyIds]);

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
      setEditingId(null);
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
      setEditingId(null);
      setNotice({ kind: "ok", text: `Medalha #${row.id} removida.` });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao remover a medalha." });
    }
  }

  const nextId = draft.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  const editing = editingId == null ? null : draft.find((r) => r.id === editingId) ?? null;
  const editIdx = editing ? visible.findIndex((r) => r.id === editing.id) : -1;
  const closeEditor = useCallback(() => setEditingId(null), []);
  const closeAdd = useCallback(() => setAdding(false), []);

  const filterButton = (key: Filter, label: string, count?: number) => (
    <button
      key={key}
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
        filter === key ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
      }`}
    >
      {label} {count != null && <span className="opacity-60">{count}</span>}
    </button>
  );

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="medals-admin-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="medals-admin-title" className="text-xl font-semibold">Medalhas</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Clique numa medalha para editar. Preencha só a <strong className="font-medium text-fg">%</strong> de cada buff/debuff, como aparece no jogo (ex.: 0.2 e 0.3).
            Velocidades (Pokémon, personagem, voo, surf e cavalgar) são número inteiro, sem % (ex.: 5). Para uma medalha nova, use “Adicionar medalha”.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-sm font-medium text-gold hover:bg-gold/20"
        >
          <Plus className="size-4" aria-hidden /> Adicionar medalha
        </button>
      </div>

      {adding && (
        <Overlay title={<h3 className="text-lg font-semibold">Nova medalha</h3>} onClose={closeAdd}>
          <AddForm
            suggestedId={nextId}
            existingIds={new Set(draft.map((r) => r.id))}
            customKeys={customKeys}
            onAdd={(row) => {
              setDraft((d) => [row, ...d]);
              setAdding(false);
              setQuery("");
              setFilter("all");
              setNotice({ kind: "ok", text: `Medalha #${row.id} adicionada. Clique em “Salvar alterações” para gravar.` });
            }}
            onCancel={closeAdd}
          />
        </Overlay>
      )}

      {editing && (
        <MedalEditor
          key={editing.id}
          row={editing}
          changed={isDirty(editing, savedById.get(editing.id))}
          isNew={!savedById.has(editing.id)}
          error={isDirty(editing, savedById.get(editing.id)) ? errors.get(editing.id) ?? null : null}
          customKeys={customKeys}
          position={editIdx >= 0 ? { index: editIdx + 1, total: visible.length } : null}
          onPatch={(change) => patch(editing.id, change)}
          onPrev={editIdx > 0 ? () => setEditingId(visible[editIdx - 1].id) : null}
          onNext={editIdx >= 0 && editIdx < visible.length - 1 ? () => setEditingId(visible[editIdx + 1].id) : null}
          onRevert={() => {
            const base = savedById.get(editing.id);
            if (base) patch(editing.id, base);
          }}
          onRemove={() => void remove(editing)}
          onClose={closeEditor}
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
            <div className="flex flex-wrap gap-2">
              {filterButton("all", "Todas", saved.length)}
              {filterButton("missing", "Faltam %", missingCount)}
              {filterButton("changed", "Editadas", dirty.length)}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            {saved.length - missingCount} de {saved.length} com a % preenchida · mostrando {visible.length}
            <span className="ml-3 text-xs">
              <span className="mr-1 inline-block size-2 rounded-full border border-amber-500/70" aria-hidden /> falta %
              <span className="ml-3 mr-1 inline-block size-2 rounded-full bg-gold" aria-hidden /> editada
            </span>
          </p>

          {visible.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visible.map((r) => (
                <AdminTile
                  key={r.id}
                  row={r}
                  changed={dirtyIds.has(r.id)}
                  isNew={!savedById.has(r.id)}
                  onOpen={() => setEditingId(r.id)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">Nenhuma medalha encontrada.</p>
          )}

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
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
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
        <label className="block">
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
