"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDown, ArrowUp, CheckCircle2, PawPrint, Plus, RotateCcw, Trash2, User, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { ItemImage } from "@/components/talents/ItemImage";
import { ItemPicker } from "./ItemPicker";
import {
  MAX_ITEM_QUANTITY,
  MAX_TALENT_ITEMS,
  MAX_TALENT_TEXT,
  standardBonuses,
  TALENT_CATEGORIES,
  type TalentCategory,
} from "@/config/talents";
import type { TalentItem } from "@/lib/talents/items";

type Req = { itemId: number; quantity: string };
type Draft = { key: string; id: number | null; description: string; requirements: Req[] };
type ApiTalent = { id: number; category: string; description: string; requirements: { itemId: number; quantity: number }[] };
type Notice = { kind: "ok" | "error"; text: string };

const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg placeholder:text-muted/60 aria-[invalid=true]:border-red-400";
const OTHER = "__other";

let keySeq = 0;
const newKey = () => `n${++keySeq}`;

const toDrafts = (list: ApiTalent[]): Draft[] =>
  list.map((t) => ({
    key: `t${t.id}`,
    id: t.id,
    description: t.description,
    requirements: t.requirements.map((r) => ({ itemId: r.itemId, quantity: String(r.quantity) })),
  }));

const signature = (list: Draft[] | undefined) =>
  JSON.stringify((list ?? []).map((t) => [t.id, t.description.trim(), t.requirements.map((r) => [r.itemId, r.quantity.trim()])]));

function validate(t: Draft): string | null {
  const text = t.description.trim();
  if (!text) return "Escolha ou escreva o bônus.";
  if (text.length > MAX_TALENT_TEXT) return `O texto do bônus passa de ${MAX_TALENT_TEXT} letras.`;
  for (const r of t.requirements) {
    const q = r.quantity.trim();
    if (!/^\d{1,6}$/.test(q) || Number(q) < 1 || Number(q) > MAX_ITEM_QUANTITY) return "A quantidade de cada item deve ser um número inteiro maior que zero.";
  }
  return null;
}

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function CategoryIcon({ category, className = "size-5" }: { category: TalentCategory; className?: string }) {
  if (category.type) return <TypeIcon type={category.type} className={className} />;
  const Icon = category.key === "character" ? User : PawPrint;
  return (
    <span className={`inline-grid shrink-0 place-items-center rounded-full bg-gold/15 text-gold ${className}`} aria-hidden>
      <Icon className="size-[60%]" aria-hidden />
    </span>
  );
}

export function TalentsManager({ itemsVersion }: { itemsVersion: number }) {
  const [items, setItems] = useState<TalentItem[]>([]);
  const [saved, setSaved] = useState<Record<string, Draft[]>>({});
  const [draft, setDraft] = useState<Record<string, Draft[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [selected, setSelected] = useState(TALENT_CATEGORIES[0].key);
  const [pickerFor, setPickerFor] = useState<string | null>(null); // key do talento que recebe o item

  const category = TALENT_CATEGORIES.find((c) => c.key === selected) ?? TALENT_CATEGORIES[0];
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const loadItems = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/talent-items", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os itens."));
      setItems(data.items as TalentItem[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar os itens.");
    }
  }, []);

  /** `replace`: categorias cujo rascunho vira o que está salvo agora (ou "all"). */
  const loadTalents = useCallback(async (replace: string[] | "all") => {
    const response = await fetch("/api/admin/talents", { cache: "no-store" });
    const data = await readJson(response);
    if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os talentos."));
    const rows = data.talents as ApiTalent[];
    const grouped: Record<string, Draft[]> = {};
    for (const c of TALENT_CATEGORIES) grouped[c.key] = toDrafts(rows.filter((r) => r.category === c.key));
    setSaved((s) => ({ ...s, ...Object.fromEntries(Object.entries(grouped).filter(([k]) => replace === "all" || replace.includes(k))) }));
    setDraft((d) => ({ ...d, ...Object.fromEntries(Object.entries(grouped).filter(([k]) => replace === "all" || replace.includes(k))) }));
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      await Promise.all([loadItems(), loadTalents("all")]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar os talentos.");
    } finally {
      setLoading(false);
    }
  }, [loadItems, loadTalents]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // A aba Itens mexeu em algo (novo item, nome, imagem): atualiza só a lista de itens.
  useEffect(() => {
    if (itemsVersion > 0) void loadItems();
  }, [itemsVersion, loadItems]);

  const list = draft[selected] ?? [];
  const isDirty = (key: string) => signature(draft[key]) !== signature(saved[key]);
  const dirtyCategories = TALENT_CATEGORIES.filter((c) => isDirty(c.key));
  const errors = useMemo(() => {
    const out: string[] = [];
    for (const c of dirtyCategories) (draft[c.key] ?? []).forEach((t, i) => {
      const problem = validate(t);
      if (problem) out.push(`${c.label}, talento ${i + 1}: ${problem}`);
    });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula quando o rascunho muda
  }, [draft, saved]);

  const patchList = (key: string, fn: (l: Draft[]) => Draft[]) => {
    setNotice(null);
    setDraft((d) => ({ ...d, [key]: fn(d[key] ?? []) }));
  };
  const patchTalent = (talentKey: string, fn: (t: Draft) => Draft) => patchList(selected, (l) => l.map((t) => (t.key === talentKey ? fn(t) : t)));

  function move(index: number, delta: number) {
    patchList(selected, (l) => {
      const next = [...l];
      const target = index + delta;
      if (target < 0 || target >= next.length) return l;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setNotice(null);
    const done: string[] = [];
    try {
      for (const c of dirtyCategories) {
        const response = await fetch("/api/admin/talents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: c.key,
            talents: (draft[c.key] ?? []).map((t) => ({
              id: t.id,
              description: t.description.trim(),
              requirements: t.requirements.map((r) => ({ itemId: r.itemId, quantity: Number(r.quantity.trim()) })),
            })),
          }),
        });
        const data = await readJson(response);
        if (!response.ok) throw new Error(`${c.label}: ${String(data.error || "não foi possível salvar.")}`);
        done.push(c.key);
      }
      await loadTalents(done);
      setNotice({ kind: "ok", text: `${done.length} ${done.length === 1 ? "categoria salva" : "categorias salvas"} com sucesso.` });
    } catch (error) {
      if (done.length) await loadTalents(done).catch(() => undefined);
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao salvar os talentos." });
    } finally {
      setSaving(false);
    }
  }

  const closePicker = useCallback(() => setPickerFor(null), []);
  const pickerTalent = pickerFor ? list.find((t) => t.key === pickerFor) ?? null : null;
  const withoutItems = list.filter((t) => t.requirements.length === 0).length;

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="talents-admin-title">
      <h2 id="talents-admin-title" className="text-xl font-semibold">Talentos</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Escolha a categoria e, em cada talento, adicione os itens que o jogador precisa entregar (com a quantidade). Os bônus dos 18 tipos já vêm cadastrados; só os itens mudam.
        Em Personagem e Pokémon você pode escrever o bônus e adicionar mais talentos.
      </p>

      {loading ? (
        <p className="mt-6 text-sm text-muted">Carregando talentos...</p>
      ) : loadError ? (
        <div role="alert" className="mt-6 flex items-start gap-2 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p>{loadError}</p>
            <button type="button" onClick={() => void loadAll()} className="mt-2 underline">Tentar de novo</button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-5 md:flex-row">
            <nav aria-label="Categorias de talentos" className="flex flex-wrap gap-1.5 md:w-56 md:shrink-0 md:flex-col md:flex-nowrap">
              {TALENT_CATEGORIES.map((c) => {
                const on = c.key === selected;
                const total = draft[c.key]?.length ?? 0;
                const empty = (draft[c.key] ?? []).filter((t) => t.requirements.length === 0).length;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelected(c.key)}
                    aria-current={on ? "true" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      on ? "border-gold bg-gold/10 text-gold" : "border-line bg-raised text-muted hover:text-fg"
                    }`}
                  >
                    <CategoryIcon category={c} className="size-6" />
                    <span className="flex-1 font-medium">{c.label}</span>
                    {isDirty(c.key) && <span className="size-2 rounded-full bg-gold" title="Alterações não salvas" />}
                    <span className={`text-[11px] tabular-nums ${total > 0 && empty === 0 ? "text-teal" : "text-muted"}`} title={`${total - empty} de ${total} talentos com itens`}>
                      {total - empty}/{total}
                    </span>
                  </button>
                );
              })}
            </nav>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <CategoryIcon category={category} className="size-9" />
                <div>
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <p className="text-xs text-muted">
                    {list.length} {list.length === 1 ? "talento" : "talentos"}
                    {withoutItems > 0 && <span className="text-amber-300"> · {withoutItems} sem itens</span>}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {list.length === 0 && <p className="text-sm text-muted">Nenhum talento nesta categoria ainda. Use “Adicionar talento”.</p>}
                {list.map((t, index) => {
                  const problem = isDirty(selected) ? validate(t) : null;
                  const options = category.type ? standardBonuses(category.type) : null;
                  const isCustom = options ? !options.includes(t.description) : true;
                  return (
                    <div key={t.key} className={`rounded-xl border bg-black/20 p-3 ${t.requirements.length === 0 ? "border-amber-500/40" : "border-line"}`}>
                      <div className="flex items-start gap-2">
                        <span className="mt-2 w-6 shrink-0 text-center text-xs font-semibold tabular-nums text-muted">{index + 1}</span>
                        <div className="min-w-0 flex-1 space-y-2">
                          {options && (
                            <select
                              aria-label={`Talento ${index + 1}: bônus`}
                              value={isCustom ? OTHER : t.description}
                              onChange={(e) => patchTalent(t.key, (x) => ({ ...x, description: e.target.value === OTHER ? "" : e.target.value }))}
                              className={inputClass}
                            >
                              {options.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                              <option value={OTHER}>Outro texto…</option>
                            </select>
                          )}
                          {(!options || isCustom) && (
                            <input
                              aria-label={`Talento ${index + 1}: texto do bônus`}
                              aria-invalid={problem != null && !t.description.trim()}
                              value={t.description}
                              maxLength={MAX_TALENT_TEXT}
                              onChange={(e) => patchTalent(t.key, (x) => ({ ...x, description: e.target.value }))}
                              placeholder="Escreva o bônus, como aparece no jogo"
                              className={inputClass}
                            />
                          )}

                          <div className="flex flex-wrap items-stretch gap-2">
                            {t.requirements.map((r) => {
                              const item = itemsById.get(r.itemId);
                              const name = item?.name ?? "item removido";
                              return (
                                <div key={r.itemId} className="relative flex w-[5.25rem] flex-col items-center gap-1 rounded-lg border border-line bg-black/30 p-1.5">
                                  <button
                                    type="button"
                                    onClick={() => patchTalent(t.key, (x) => ({ ...x, requirements: x.requirements.filter((q) => q.itemId !== r.itemId) }))}
                                    aria-label={`Tirar ${name}`}
                                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-line bg-panel text-muted hover:text-red-300"
                                  >
                                    <X className="size-3" aria-hidden />
                                  </button>
                                  <ItemImage path={item?.imagePath} name={name} className="size-11" />
                                  <span className="line-clamp-2 w-full break-words text-center text-[10px] leading-tight" title={name}>{name}</span>
                                  <input
                                    inputMode="numeric"
                                    aria-label={`Quantidade de ${name}`}
                                    aria-invalid={problem != null && !/^\d{1,6}$/.test(r.quantity.trim())}
                                    value={r.quantity}
                                    onChange={(e) => patchTalent(t.key, (x) => ({ ...x, requirements: x.requirements.map((q) => (q.itemId === r.itemId ? { ...q, quantity: e.target.value } : q)) }))}
                                    className="w-full rounded-md border border-line bg-raised px-1 py-1 text-center text-sm font-semibold tabular-nums aria-[invalid=true]:border-red-400"
                                  />
                                </div>
                              );
                            })}
                            {t.requirements.length < MAX_TALENT_ITEMS && (
                              <button
                                type="button"
                                onClick={() => setPickerFor(t.key)}
                                className="flex min-h-[7.25rem] w-[5.25rem] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gold/50 text-xs text-gold hover:bg-gold/10"
                              >
                                <Plus className="size-5" aria-hidden /> Item
                              </button>
                            )}
                          </div>
                          {problem && <p role="alert" className="text-xs text-red-300">{problem}</p>}
                        </div>

                        <div className="flex shrink-0 flex-col gap-1">
                          <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Subir o talento ${index + 1}`} className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg disabled:opacity-25">
                            <ArrowUp className="size-4" aria-hidden />
                          </button>
                          <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label={`Descer o talento ${index + 1}`} className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-white/5 hover:text-fg disabled:opacity-25">
                            <ArrowDown className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => patchList(selected, (l) => l.filter((x) => x.key !== t.key))}
                            aria-label={`Remover o talento ${index + 1}`}
                            title="Remover talento"
                            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-red-500/15 hover:text-red-300"
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => patchList(selected, (l) => [...l, { key: newKey(), id: null, description: category.type ? standardBonuses(category.type)[0] : "", requirements: [] }])}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-sm font-medium text-gold hover:bg-gold/20"
              >
                <Plus className="size-4" aria-hidden /> Adicionar talento
              </button>
            </div>
          </div>

          <Dialog open={pickerTalent !== null} onClose={closePicker} title="Escolher item">
            {pickerTalent && (
              <ItemPicker
                items={items}
                excludeIds={new Set(pickerTalent.requirements.map((r) => r.itemId))}
                onClose={closePicker}
                onPick={(item) => patchTalent(pickerTalent.key, (x) => ({ ...x, requirements: [...x.requirements, { itemId: item.id, quantity: "1" }] }))}
              />
            )}
          </Dialog>

          <div className="sticky bottom-3 z-10 mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-raised/95 p-3 shadow-lg shadow-black/40 backdrop-blur">
            <p role="status" className="min-w-0 flex-1 text-sm">
              {notice ? (
                <span className={`flex items-center gap-2 ${notice.kind === "ok" ? "text-teal" : "text-red-300"}`}>
                  {notice.kind === "ok" ? <CheckCircle2 className="size-4 shrink-0" aria-hidden /> : <AlertCircle className="size-4 shrink-0" aria-hidden />}
                  {notice.text}
                </span>
              ) : dirtyCategories.length > 0 ? (
                <span className="text-muted">
                  Alterações não salvas em: <span className="text-fg">{dirtyCategories.map((c) => c.label).join(", ")}</span>.
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
              disabled={dirtyCategories.length === 0 || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40"
            >
              <RotateCcw className="size-4" aria-hidden /> Descartar
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={dirtyCategories.length === 0 || errors.length > 0 || saving}
              className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
