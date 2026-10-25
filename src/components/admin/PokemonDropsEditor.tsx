"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { ItemImage } from "@/components/talents/ItemImage";
import { MAX_DROP_QUANTITY, MAX_DROPS_PER_POKEMON, ZONES, isZone, type ZoneKey } from "@/lib/drops/types";
import type { TalentItem } from "@/lib/talents/items";
import { ItemPicker } from "./ItemPicker";

export type DropDraft = { key: string; itemId: number; zone: ZoneKey; min: string; max: string; chance: string; veryRare: boolean };

type ApiDrop = { itemId: number; zone: string; min: number | null; max: number | null; chance: number | null; veryRare: boolean };

let keySeq = 0;
const newKey = () => `d${++keySeq}`;

const signature = (list: DropDraft[]) => JSON.stringify(list.map((d) => [d.itemId, d.zone, d.min.trim(), d.max.trim(), d.chance.trim(), d.veryRare]));

const toDraft = (d: ApiDrop): DropDraft => ({
  key: newKey(),
  itemId: d.itemId,
  zone: isZone(d.zone) ? d.zone : "base",
  min: d.min == null ? "1" : String(d.min),
  max: d.max == null || d.max === d.min ? "" : String(d.max),
  chance: d.chance == null ? "" : String(d.chance),
  veryRare: d.veryRare,
});

const parseChance = (text: string) => Number(text.trim().replace(",", "."));

/** Texto do problema (ou `null` se está tudo certo), para mostrar antes de salvar. */
export function validateDrops(list: DropDraft[]): string | null {
  for (const [i, d] of list.entries()) {
    const label = `Drop ${i + 1}`;
    const min = d.min.trim();
    const max = d.max.trim();
    if (!/^\d{1,6}$/.test(min) || Number(min) < 1 || Number(min) > MAX_DROP_QUANTITY) return `${label}: a quantidade mínima deve ser um número inteiro maior que zero.`;
    if (max && (!/^\d{1,6}$/.test(max) || Number(max) < Number(min))) return `${label}: a quantidade máxima deve ser um número inteiro e não menor que a mínima.`;
    if (d.chance.trim()) {
      const chance = parseChance(d.chance);
      if (!Number.isFinite(chance) || chance <= 0 || chance > 100) return `${label}: a chance deve ser maior que 0 e no máximo 100.`;
      if (d.veryRare) return `${label}: use a chance em % OU “Muito raro”, não os dois.`;
    }
  }
  return null;
}

/** O que a API espera receber. */
export const dropsPayload = (list: DropDraft[]) =>
  list.map((d) => ({
    itemId: d.itemId,
    zone: d.zone,
    min: Number(d.min.trim()),
    max: d.max.trim() ? Number(d.max.trim()) : null,
    chance: d.chance.trim() && !d.veryRare ? parseChance(d.chance) : null,
    veryRare: d.veryRare,
  }));

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/**
 * Carrega os itens e os drops do Pokémon. Pokémon que ainda não está no catálogo começa sem drops.
 * `dirty` só fica verdadeiro quando os drops foram carregados e você mexeu neles.
 */
export function usePokemonDrops(pokemonId: string, inCatalog: boolean) {
  const [items, setItems] = useState<TalentItem[]>([]);
  const [itemsError, setItemsError] = useState("");
  const [drops, setDrops] = useState<DropDraft[]>([]);
  const [original, setOriginal] = useState(signature([]));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/talent-items", { cache: "no-store" })
      .then(async (response) => {
        const data = await readJson(response);
        if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os itens."));
        if (!cancelled) setItems(data.items as TalentItem[]);
      })
      .catch((e) => !cancelled && setItemsError(e instanceof Error ? e.message : "Erro ao carregar os itens."));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!inCatalog) {
      setDrops([]);
      setOriginal(signature([]));
      setStatus("ready");
      return;
    }
    setStatus("loading");
    setError("");
    fetch(`/api/admin/pokemon-drops?pokemonId=${encodeURIComponent(pokemonId)}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await readJson(response);
        if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os drops."));
        if (cancelled) return;
        const loaded = (data.drops as ApiDrop[]).map(toDraft);
        setDrops(loaded);
        setOriginal(signature(loaded));
        setStatus("ready");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Erro ao carregar os drops.");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [pokemonId, inCatalog]);

  return { items, itemsError, drops, setDrops, status, error, dirty: status === "ready" && signature(drops) !== original };
}

export type PokemonDropsState = ReturnType<typeof usePokemonDrops>;

const smallInput = "rounded-md border border-line bg-raised px-2 py-1.5 text-center text-sm tabular-nums text-fg placeholder:text-muted/60";

export function PokemonDropsEditor({ state }: { state: PokemonDropsState }) {
  const { items, itemsError, drops, setDrops, status, error } = state;
  const [zone, setZone] = useState<ZoneKey>("base");
  const [picking, setPicking] = useState(false);
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const closePicker = useCallback(() => setPicking(false), []);

  const inZone = drops.filter((d) => d.zone === zone);
  const patch = (key: string, change: Partial<DropDraft>) => setDrops((l) => l.map((d) => (d.key === key ? { ...d, ...change } : d)));

  return (
    <fieldset>
      <legend className="mb-1 text-sm text-muted">Drops de itens <span className="text-xs">(opcional)</span></legend>
      <p className="mb-3 text-xs text-muted">Itens que este Pokémon dropa, com a quantidade e a chance como aparecem no jogo. Cada zona tem a sua lista.</p>

      {status === "loading" && <p className="text-sm text-muted">Carregando drops...</p>}

      {status === "error" && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error} Você ainda pode salvar o Pokémon; os drops dele não serão alterados.</span>
        </p>
      )}

      {status === "ready" && (
        <>
          {itemsError && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {itemsError}
            </p>
          )}

          <div role="tablist" aria-label="Zona" className="mb-3 flex flex-wrap gap-1.5">
            {ZONES.map((z) => (
              <button
                key={z.key}
                type="button"
                role="tab"
                aria-selected={z.key === zone}
                onClick={() => setZone(z.key)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                  z.key === zone ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"
                }`}
              >
                {z.label} <span className="opacity-60">{drops.filter((d) => d.zone === z.key).length}</span>
              </button>
            ))}
          </div>

          {inZone.length === 0 && <p className="mb-3 text-sm text-muted">Nenhum drop na zona {ZONES.find((z) => z.key === zone)?.label}.</p>}

          <ul className="space-y-2">
            {inZone.map((d) => {
              const item = itemsById.get(d.itemId);
              const name = item?.name ?? "item removido";
              return (
                <li key={d.key} className="rounded-lg border border-line bg-black/20 p-2.5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="flex min-w-0 flex-1 basis-40 items-center gap-2">
                      <ItemImage path={item?.imagePath} name={name} className="size-10" />
                      <span className="truncate text-sm font-medium">{name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span>Qtd.</span>
                      <input inputMode="numeric" aria-label={`Quantidade mínima de ${name}`} value={d.min} onChange={(e) => patch(d.key, { min: e.target.value })} className={`${smallInput} w-14`} />
                      <span aria-hidden>a</span>
                      <input inputMode="numeric" aria-label={`Quantidade máxima de ${name}`} value={d.max} onChange={(e) => patch(d.key, { max: e.target.value })} placeholder={d.min || "1"} className={`${smallInput} w-14`} />
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <span>Chance</span>
                      <input
                        inputMode="decimal"
                        aria-label={`Chance de ${name} em %`}
                        value={d.veryRare ? "" : d.chance}
                        disabled={d.veryRare}
                        onChange={(e) => patch(d.key, { chance: e.target.value })}
                        placeholder="—"
                        className={`${smallInput} w-[4.5rem] disabled:opacity-40`}
                      />
                      <span aria-hidden>%</span>
                    </div>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                      <input type="checkbox" checked={d.veryRare} onChange={(e) => patch(d.key, { veryRare: e.target.checked, chance: e.target.checked ? "" : d.chance })} className="size-4 accent-[var(--color-gold)]" />
                      Muito raro
                    </label>
                    <button
                      type="button"
                      onClick={() => setDrops((l) => l.filter((x) => x.key !== d.key))}
                      aria-label={`Tirar ${name} desta zona`}
                      className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-red-500/15 hover:text-red-300"
                    >
                      <X className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => setPicking(true)}
            disabled={drops.length >= MAX_DROPS_PER_POKEMON || items.length === 0}
            title={items.length === 0 ? "Envie as imagens dos itens na aba Itens primeiro" : undefined}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gold/60 bg-gold/10 px-3 py-2 text-sm font-medium text-gold hover:bg-gold/20 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden /> Adicionar item
          </button>

          <Dialog open={picking} onClose={closePicker} title="Escolher item">
            <ItemPicker
              items={items}
              excludeIds={new Set(inZone.map((d) => d.itemId))}
              onClose={closePicker}
              onPick={(item) => setDrops((l) => [...l, { key: newKey(), itemId: item.id, zone, min: "1", max: "", chance: "", veryRare: false }])}
            />
          </Dialog>
        </>
      )}
    </fieldset>
  );
}
