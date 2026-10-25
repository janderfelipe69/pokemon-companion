"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, FileJson, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { BoostTypePicker } from "@/components/guild/BoostTypePicker";
import { TypeIcon } from "@/components/pokedex/TypeIcon";
import { Dialog } from "@/components/ui/Dialog";
import { normalizeWants, sameWants, STONE_TIERS, type BoostWant } from "@/config/guildBoost";
import { normalizeNick } from "@/lib/guild/boostMembers";
import { normalizeText } from "@/lib/talents/items";

type Member = { id: number; name: string; wants: BoostWant[] };
type Notice = { kind: "ok" | "error"; text: string; details?: string };
type Filter = "all" | "empty";

const inputClass = "w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg placeholder:text-muted/60";

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Nicks de um JSON exportado do jogo ({ members: [{ name }] }) ou de uma lista simples de nicks. */
function namesFromJson(text: string): string[] {
  const data: unknown = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data as { members?: unknown })?.members;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const name = typeof item === "string" ? item : (item as { name?: unknown })?.name;
    return typeof name === "string" && normalizeNick(name) ? [normalizeNick(name)] : [];
  });
}

export function GuildMembersManager() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [newNames, setNewNames] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/guild-members", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os membros."));
      setMembers((data.members as { id: number; name: string; wants: unknown }[]).map((m) => ({ ...m, wants: normalizeWants(m.wants) })));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Erro ao carregar os membros.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyCount = useMemo(() => members.filter((m) => m.wants.length === 0).length, [members]);
  const visible = useMemo(() => {
    // Ignora maiúsculas, acentos e espaços: "true" acha "T R U E".
    const compact = (text: string) => normalizeText(text).replace(/\s+/g, "");
    const q = compact(query);
    return members.filter((m) => (!q || compact(m.name).includes(q)) && (filter === "all" || m.wants.length === 0));
  }, [members, query, filter]);

  async function addNames(names: string[], fromFile?: string[]) {
    setAdding(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/guild-members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ names }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível adicionar."));
      const added = data.added as string[];
      const skipped = data.skipped as string[];
      // Com o JSON da guilda, avisa quem está cadastrado mas NÃO está no JSON (pode ter saído da guilda).
      const inFile = fromFile ? new Set(fromFile.map((n) => n.toLowerCase())) : null;
      const notInFile = inFile ? members.filter((m) => !inFile.has(normalizeNick(m.name).toLowerCase())).map((m) => m.name) : [];
      setNotice({
        kind: "ok",
        text: `${added.length} ${added.length === 1 ? "membro adicionado" : "membros adicionados"}${skipped.length ? `, ${skipped.length} ${skipped.length === 1 ? "já existia" : "já existiam"}` : ""}.`,
        details: notInFile.length ? `Cadastrados que não estão nesse JSON (talvez saíram da guilda): ${notInFile.join(", ")}.` : undefined,
      });
      setNewNames("");
      await load();
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Erro ao adicionar." });
    } finally {
      setAdding(false);
    }
  }

  async function importFile(file: File) {
    try {
      const names = namesFromJson(await file.text());
      if (names.length === 0) throw new Error("Não encontrei nenhum nick nesse arquivo.");
      await addNames(names, names);
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof SyntaxError ? "Esse arquivo não é um JSON válido." : error instanceof Error ? error.message : "Erro ao ler o arquivo." });
    }
  }

  const editing = editingId == null ? null : members.find((m) => m.id === editingId) ?? null;
  const closeEditor = useCallback(() => setEditingId(null), []);

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6" aria-labelledby="guild-admin-title">
      <h2 id="guild-admin-title" className="text-xl font-semibold">Membros da guilda</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted">
        Quem está aqui pode entrar no botão <strong className="font-medium text-fg">Guilda</strong> do site (nick + senha) e escolher os tipos de stone que quer receber. Adicione ou remova membros e,
        se precisar, ajuste os tipos de alguém.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-black/20 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><UserPlus className="size-4 text-gold" aria-hidden /> Adicionar membros</h3>
          <label className="mt-3 block">
            <span className="mb-1 block text-xs text-muted">Um nick por linha</span>
            <textarea value={newNames} onChange={(e) => setNewNames(e.target.value)} rows={3} placeholder={"Ex.:\nT R U E\nRochman"} className={`${inputClass} resize-y font-mono`} />
          </label>
          <button
            type="button"
            onClick={() => void addNames(newNames.split("\n").map(normalizeNick).filter(Boolean))}
            disabled={adding || !newNames.trim()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden /> {adding ? "Adicionando..." : "Adicionar"}
          </button>
        </div>

        <div className="rounded-xl border border-line bg-black/20 p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileJson className="size-4 text-gold" aria-hidden /> Importar o JSON da guilda</h3>
          <p className="mt-2 text-xs text-muted">Escolha o arquivo exportado do jogo (GuildMembers...json). Os nicks novos entram; quem já existe é ignorado e ninguém é removido.</p>
          <input
            type="file"
            accept="application/json,.json"
            disabled={adding}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importFile(file);
            }}
            className="mt-3 block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:text-sm file:text-fg"
          />
        </div>
      </div>

      {notice && (
        <div role="status" className={`mt-4 rounded-xl border p-3 text-sm ${notice.kind === "ok" ? "border-teal/40 bg-teal/10 text-teal" : "border-red-400/40 bg-red-500/10 text-red-200"}`}>
          <p className="flex items-start gap-2">
            {notice.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />}
            {notice.text}
          </p>
          {notice.details && <p className="mt-1.5 pl-6 text-xs text-muted">{notice.details}</p>}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-sm text-muted">Carregando membros...</p>
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
            <label className="block min-w-56 flex-1 sm:max-w-sm">
              <span className="mb-1.5 block text-sm text-muted">Buscar membro pelo nick</span>
              <span className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: Rochman" className={`${inputClass} pl-9`} />
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["all", "Todos", members.length],
                  ["empty", "Sem tipos escolhidos", emptyCount],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  aria-pressed={filter === key}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${filter === key ? "border-gold bg-gold/15 text-gold" : "border-line bg-raised text-muted hover:text-fg"}`}
                >
                  {label} <span className="opacity-60">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            {members.length} {members.length === 1 ? "membro" : "membros"} · mostrando {visible.length} · clique num membro para editar
          </p>

          {visible.length > 0 ? (
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setEditingId(m.id)} className="flex h-full w-full flex-col gap-2 rounded-xl border border-line bg-black/25 p-3 text-left transition-colors hover:border-gold/50 hover:bg-white/5">
                    <span className="font-semibold">{m.name}</span>
                    {m.wants.length > 0 ? (
                      <span className="flex flex-wrap gap-1">
                        {m.wants.map((w) => (
                          <span key={w.type} title={w.tiers.map((k) => STONE_TIERS.find((t) => t.key === k)?.label ?? k).join(", ")}>
                            <TypeIcon type={w.type} className="size-6" />
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-300">ainda não escolheu nenhum tipo</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted">{members.length === 0 ? "Ainda não há membros. Adicione acima ou importe o JSON da guilda." : "Nenhum membro encontrado."}</p>
          )}
        </>
      )}

      <Dialog open={editing !== null} onClose={closeEditor} title="Editar membro">
        {editing && (
          <MemberEditor
            key={editing.id}
            member={editing}
            onClose={closeEditor}
            onChanged={async (text) => {
              await load();
              if (text) setNotice({ kind: "ok", text });
            }}
          />
        )}
      </Dialog>
    </section>
  );
}

function MemberEditor({ member, onClose, onChanged }: { member: Member; onClose: () => void; onChanged: (message?: string) => Promise<void> }) {
  const [name, setName] = useState(member.name);
  const [wants, setWants] = useState<BoostWant[]>(member.wants);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const changed = normalizeNick(name) !== member.name || !sameWants(wants, member.wants);

  async function request(method: "PATCH" | "DELETE", body: unknown) {
    const response = await fetch("/api/admin/guild-members", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await readJson(response);
    if (!response.ok) throw new Error(String(data.error || "Não foi possível concluir."));
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const nick = normalizeNick(name);
      await request("PATCH", { id: member.id, ...(nick !== member.name ? { name: nick } : {}), wants });
      await onChanged(`${nick} atualizado.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Remover ${member.name} da guilda? Ele deixa de conseguir entrar e as escolhas dele são apagadas.`)) return;
    setBusy(true);
    setError("");
    try {
      await request("DELETE", { id: member.id });
      await onChanged(`${member.name} removido.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-5 pr-14">
      <h3 className="text-lg font-semibold">Editar membro</h3>
      <label className="mt-4 block max-w-sm">
        <span className="mb-1 block text-xs text-muted">Nick</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className={inputClass} />
      </label>
      <p className="mb-2 mt-4 text-xs text-muted">Tipos e níveis que ele quer receber</p>
      <BoostTypePicker value={wants} onChange={setWants} disabled={busy} />

      {error && (
        <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-300">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void remove()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 disabled:opacity-40">
          <Trash2 className="size-4" aria-hidden /> Remover da guilda
        </button>
        <span className="flex-1" />
        <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-line px-4 py-2 text-sm text-muted hover:text-fg">
          Cancelar
        </button>
        <button type="button" onClick={() => void save()} disabled={busy || !changed || !normalizeNick(name)} className="rounded-lg bg-gold px-5 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
          {busy ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}
