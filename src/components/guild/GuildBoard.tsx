"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Clipboard, Download, FolderInput, Undo2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { computeBoard, parseExportedAt } from "@/lib/guild/board";
import { parseGuildExport } from "@/lib/guild/parse";
import { BOARD_WIDTH, boardHeight, drawBoard } from "@/lib/guild/render";
import type { GuildExport, GuildFileInfo } from "@/lib/guild/types";

/** A imagem é desenhada em 2x para ficar nítida ao baixar. */
const SCALE = 2;
const MAX_UPLOAD_BYTES = 1_000_000;

type Props = {
  /** Exportação escolhida na pasta (a mais recente, ou a do ?arquivo=). */
  current: GuildExport | null;
  /** Exportação logo anterior na pasta, para mostrar variação de nível e quem entrou/saiu. */
  previous: GuildExport | null;
  currentFile: string | null;
  files: GuildFileInfo[];
  /** Só quem está logado na Administração pode gravar na pasta. */
  canSave: boolean;
};

const buttonClass =
  "inline-flex items-center gap-2 rounded-lg border border-line bg-raised px-3.5 py-2 text-sm font-medium transition-colors hover:border-gold/50 hover:text-gold disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(exportedAt: string): string {
  const d = parseExportedAt(exportedAt);
  if (!d) return exportedAt || "data desconhecida";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fileSlug(guild: string): string {
  return guild.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "guilda";
}

export function GuildBoard({ current, previous, currentFile, files, canSave }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emblem, setEmblem] = useState<HTMLImageElement | null>(null);
  const [local, setLocal] = useState<{ data: GuildExport; name: string } | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const active = local?.data ?? current;
  const board = useMemo(() => (active ? computeBoard(active, local ? null : previous) : null), [active, previous, local]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setEmblem(img);
    img.src = "/guild/emblem.png";
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !board) return;
    canvas.width = BOARD_WIDTH * SCALE;
    canvas.height = boardHeight(board) * SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    drawBoard(ctx, board, emblem);
  }, [board, emblem]);

  function toBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      if (!canvas) return resolve(null);
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async function handleDownload() {
    const blob = await toBlob();
    if (!blob || !active) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileSlug(active.guild)}-${active.exportedAt.slice(0, 10) || "semana"}.png`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ tone: "ok", text: "Imagem baixada." });
  }

  async function handleCopy() {
    try {
      const blob = await toBlob();
      if (!blob) throw new Error("sem imagem");
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
        setMessage({ tone: "error", text: "Este navegador não permite copiar imagens. Use “Baixar PNG”." });
        return;
      }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setMessage({ tone: "ok", text: "Imagem copiada. É só colar no Discord ou no WhatsApp." });
    } catch {
      setMessage({ tone: "error", text: "Não foi possível copiar. Use “Baixar PNG”." });
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > MAX_UPLOAD_BYTES) throw new Error("Arquivo grande demais (máximo 1 MB).");
      let json: unknown;
      try {
        json = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
      } catch {
        throw new Error("Esse arquivo não é um JSON válido.");
      }
      setLocal({ data: parseGuildExport(json), name: file.name });
      setMessage({ tone: "ok", text: "Arquivo carregado. Ele só existe nesta tela até você salvar na pasta." });
    } catch (e) {
      setMessage({ tone: "error", text: e instanceof Error ? e.message : "Não foi possível ler o arquivo." });
    }
  }

  async function handleSave() {
    if (!local) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/guild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(local.data),
      });
      const result = (await response.json()) as { ok?: boolean; file?: string; error?: string };
      if (!response.ok || !result.file) {
        setMessage({ tone: "error", text: result.error ?? "Não foi possível salvar." });
        return;
      }
      setLocal(null);
      router.push(`/guilda?arquivo=${encodeURIComponent(result.file)}`);
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: "Falha de conexão. Tente de novo." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-x-6 gap-y-4">
        {files.length > 0 && (
          <div className="min-w-0 grow basis-64">
            <label htmlFor="guild-file" className="mb-1.5 block text-xs text-muted">
              Exportação da pasta
            </label>
            <select
              id="guild-file"
              value={local ? "" : (currentFile ?? "")}
              onChange={(e) => {
                setLocal(null);
                setMessage(null);
                router.push(`/guilda?arquivo=${encodeURIComponent(e.target.value)}`);
              }}
              className="w-full rounded-lg border border-line bg-raised px-3 py-2.5 text-sm text-fg"
            >
              {local && <option value="">Arquivo enviado: {local.name}</option>}
              {files.map((f) => (
                <option key={f.file} value={f.file}>
                  {formatDate(f.exportedAt)} · {f.file}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleDownload} disabled={!board} className={buttonClass}>
            <Download className="size-4" aria-hidden /> Baixar PNG
          </button>
          <button type="button" onClick={handleCopy} disabled={!board} className={buttonClass}>
            <Clipboard className="size-4" aria-hidden /> Copiar imagem
          </button>
          <label className={`${buttonClass} cursor-pointer focus-within:outline-2 focus-within:outline-gold`}>
            <Upload className="size-4" aria-hidden /> Enviar JSON
            <input type="file" accept="application/json,.json" onChange={handleUpload} className="sr-only" />
          </label>
          {local && (
            <>
              <button type="button" onClick={() => { setLocal(null); setMessage(null); }} className={buttonClass}>
                <Undo2 className="size-4" aria-hidden /> Voltar para a pasta
              </button>
              {canSave && (
                <button type="button" onClick={handleSave} disabled={saving} className={buttonClass}>
                  <FolderInput className="size-4" aria-hidden /> {saving ? "Salvando…" : "Salvar na pasta"}
                </button>
              )}
            </>
          )}
        </div>
      </Card>

      <div aria-live="polite" className="min-h-5 text-sm">
        {message && (
          <p className={message.tone === "ok" ? "flex items-center gap-2 text-teal" : "text-red-400"}>
            {message.tone === "ok" && <Check className="size-4" aria-hidden />}
            {message.text}
          </p>
        )}
      </div>

      {active && board ? (
        <>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
            <Badge tone={local ? "gold" : "teal"}>{local ? "Arquivo enviado (não salvo)" : "Pasta data/guild"}</Badge>
            <span>Exportado em {formatDate(active.exportedAt)}</span>
            {!local && !previous && files.length > 0 && <span>· sem exportação anterior para comparar níveis</span>}
            {local && <span>· a variação de nível só aparece com arquivos da pasta</span>}
          </div>
          <div className="overflow-hidden rounded-xl border border-line">
            <canvas
              ref={canvasRef}
              role="img"
              aria-label={`Progresso semanal da guilda ${active.guild}: ${board.totals.guild} pontos no total e ${board.totals.risk} membros em risco.`}
              className="block h-auto w-full"
            />
          </div>
        </>
      ) : (
        <Card className="px-6 py-12 text-center">
          <h2 className="text-lg font-medium">Nenhuma exportação encontrada</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Coloque o JSON da guilda na pasta <code className="rounded bg-raised px-1.5 py-0.5">data/guild</code> do projeto,
            ou use “Enviar JSON” para ver a imagem agora.
          </p>
        </Card>
      )}
    </div>
  );
}
