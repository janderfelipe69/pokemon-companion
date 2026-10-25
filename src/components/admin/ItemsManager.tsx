"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, Search, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ItemImage } from "@/components/talents/ItemImage";
import { nameFromFile, normalizeText, type TalentItemWithUses } from "@/lib/talents/items";

type Notice = { kind: "ok" | "error"; text: string; details?: string[] };
type Filter = "all" | "no-pokemon" | "with-pokemon";

const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg placeholder:text-muted/60";
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

export function ItemsManager({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<TalentItemWithUses[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/talent-items", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os itens."));
      setItems(data.items as TalentItemWithUses[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar os itens.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = normalizeText(query);
    return items.filter((i) => {
      if (q && !normalizeText(i.name).includes(q)) return false;
      return filter === "all" || (filter === "no-pokemon" ? i.pokemon === 0 : i.pokemon > 0);
    });
  }, [items, query, filter]);
  const withoutPokemon = useMemo(() => items.filter((i) => i.pokemon === 0).length, [items]);

  async function upload(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(f.name));
    if (images.length === 0) {
      setNotice({ kind: "error", text: "Nenhuma imagem encontrada. Use PNG, JPG, GIF ou WebP." });
      return;
    }
    setNotice(null);
    let created = 0;
    let replaced = 0;
    const errors: string[] = [];
    setProgress({ done: 0, total: images.length });

    for (const [index, file] of images.entries()) {
      const name = nameFromFile(file.name);
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("name", name);
        const response = await fetch("/api/admin/talent-items", { method: "POST", body });
        const data = await readJson(response);
        if (!response.ok) throw new Error(String(data.error || "Falha no envio."));
        if (data.created) created += 1;
        else replaced += 1;
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : "falha no envio."}`);
      }
      setProgress({ done: index + 1, total: images.length });
    }

    setProgress(null);
    await load();
    onChanged();
    const parts = [created && `${created} ${created === 1 ? "item novo" : "itens novos"}`, replaced && `${replaced} ${replaced === 1 ? "imagem atualizada" : "imagens atualizadas"}`].filter(Boolean);
    setNotice({
      kind: errors.length && !parts.length ? "error" : "ok",
      text: parts.length ? `Enviado: ${parts.join(" e ")}.${errors.length ? ` ${errors.length} com erro.` : ""}` : "Nenhuma imagem foi enviada.",
      details: errors,
    });
  }

  const editing = editingId == null ? null : items.find((i) => i.id === editingId) ?? null;
  const closeEditor = useCallback(() => setEditingId(null), []);

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="items-admin-title">
      <h2 id="items-admin-title" className="text-xl font-semibold">Itens</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Envie as imagens dos itens (várias de uma vez). O nome do item vem do nome do arquivo: <code className="rounded bg-raised px-1">earth-ball.png</code> vira “Earth Ball”. Dá para
        renomear depois. Se você enviar um arquivo com um nome que já existe, só a imagem daquele item é trocada. Depois, é só escolher os itens na aba Talentos.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void upload(Array.from(e.dataTransfer.files));
        }}
        className={`mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragging ? "border-gold bg-gold/10" : "border-line bg-raised hover:border-gold/60"
        }`}
      >
        <ImagePlus className="size-7 text-gold" aria-hidden />
        <span className="text-sm font-medium">{progress ? `Enviando ${progress.done} de ${progress.total}...` : "Clique aqui ou arraste as imagens para cá"}</span>
        <span className="text-xs text-muted">PNG, JPG, GIF ou WebP · até 1 MB cada</span>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          disabled={progress !== null}
          className="sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (files.length) void upload(files);
          }}
        />
      </label>

      {notice && (
        <div role="status" className={`mt-4 rounded-xl border p-3 text-sm ${notice.kind === "ok" ? "border-teal/40 bg-teal/10 text-teal" : "border-red-400/40 bg-red-500/10 text-red-200"}`}>
          <p className="flex items-start gap-2">
            {notice.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
            {notice.text}
          </p>
          {notice.details && notice.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-9 text-red-200">
              {notice.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Carregando itens...</p>
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
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1 sm:max-w-md">
              <span className="mb-1.5 block text-sm text-muted">Buscar item pelo nome</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: earth ball" className={`${inputClass} pl-9`} />
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "Todos", items.length],
                  ["no-pokemon", "Sem Pokémon que dropa", withoutPokemon],
                  ["with-pokemon", "Com Pokémon", items.length - withoutPokemon],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    filter === key ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
                  }`}
                >
                  {label} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            {items.length} {items.length === 1 ? "item" : "itens"} · mostrando {visible.length}
          </p>

          {visible.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-2.5 sm:grid-cols-5 lg:grid-cols-7">
              {visible.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEditingId(item.id)}
                  title="Clique para editar"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-black/25 p-2.5 text-center transition-colors hover:border-gold/50 hover:bg-white/5"
                >
                  <ItemImage path={item.imagePath} name={item.name} className="size-14" />
                  <span className="line-clamp-2 w-full break-words text-xs font-medium leading-tight">{item.name}</span>
                  <span className="text-[10px] text-muted">{item.uses === 0 ? "sem talento" : `em ${item.uses} ${item.uses === 1 ? "talento" : "talentos"}`}</span>
                  <span className={`text-[10px] ${item.pokemon === 0 ? "text-amber-300" : "text-muted"}`}>{item.pokemon === 0 ? "sem Pokémon" : `${item.pokemon} Pokémon`}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">{items.length === 0 ? "Ainda não há itens. Envie as primeiras imagens acima." : "Nenhum item encontrado."}</p>
          )}
        </>
      )}

      <Dialog open={editing !== null} onClose={closeEditor} title="Editar item">
        {editing && (
          <ItemEditor
            key={editing.id}
            item={editing}
            onClose={closeEditor}
            onSaved={async () => {
              await load();
              onChanged();
            }}
          />
        )}
      </Dialog>
    </section>
  );
}

function ItemEditor({ item, onClose, onSaved }: { item: TalentItemWithUses; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(item.name);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  const changed = file !== null || name.trim() !== item.name;

  async function save() {
    setBusy(true);
    setError("");
    try {
      let response: Response;
      if (file) {
        const body = new FormData();
        body.append("file", file);
        body.append("id", String(item.id));
        body.append("name", name.trim());
        response = await fetch("/api/admin/talent-items", { method: "POST", body });
      } else {
        response = await fetch("/api/admin/talent-items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, name }),
        });
      }
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar o item.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Remover o item “${item.name}”? A imagem também é apagada.`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/talent-items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível remover."));
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover o item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-5 pr-14">
      <h3 className="text-lg font-semibold">Editar item</h3>
      <div className="mt-4 flex items-start gap-4">
        {preview ? (
          <span className="inline-flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold/60 bg-black/50">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local da imagem escolhida */}
            <img src={preview} alt="Nova imagem" className="size-full object-contain p-1" style={{ imageRendering: "pixelated" }} />
          </span>
        ) : (
          <ItemImage path={item.imagePath} name={item.name} className="size-24" />
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Nome</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">Trocar imagem (opcional)</span>
            <input
              type="file"
              accept={ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:text-sm file:text-fg"
            />
          </label>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {item.uses === 0 ? "Este item ainda não está em nenhum talento." : `Usado em ${item.uses} ${item.uses === 1 ? "talento" : "talentos"}.`}{" "}
        {item.pokemon === 0 ? "Nenhum Pokémon dropa este item ainda (cadastre o drop no Pokémon, em Pokémon > Meu catálogo)." : `Dropa de ${item.pokemon} Pokémon.`}
      </p>

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void remove()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40">
          <Trash2 className="size-4" aria-hidden /> Remover
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-fg">
          Cancelar
        </button>
        <button type="button" onClick={() => void save()} disabled={busy || !changed || name.trim() === ""} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
