"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, ImagePlus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { ballSlug, ballTotal, type BallData, type BallProject } from "@/config/guildBalls";
import { drawBallCard, canvasToPng, loadCardAssets, shrinkSprite } from "@/lib/guild/ballsImage";
import { parseBallText } from "@/lib/guild/ballsParse";
import { BallCardCanvas } from "./BallCardCanvas";

type Notice = { kind: "ok" | "error"; text: string };
const ghostButton = "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40";
const fmt = (n: number) => n.toLocaleString("pt-BR");
const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const title = (p: BallData) => `${p.shiny ? "Shiny " : ""}${p.pokemon}${p.number ? ` #${p.number}` : ""}`;

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

async function renderPng(data: BallData, sprite: string | null) {
  return canvasToPng(drawBallCard(data, await loadCardAssets(data, sprite)));
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Variação desde a atualização anterior (ou `null` se só houve uma). */
const delta = (p: BallProject) => (p.history.length > 1 ? p.history[0].total - p.history[1].total : null);

function Delta({ value }: { value: number | null }) {
  if (!value) return null;
  return <Badge tone={value > 0 ? "teal" : "muted"}>{value > 0 ? "+" : "−"}{fmt(Math.abs(value))}</Badge>;
}

/** Projetos de balls: cole os dados do jogo, gere a imagem, salve para a guilda (e avise no Discord). */
export function BallsView() {
  const router = useRouter();
  const [me, setMe] = useState("");
  const [projects, setProjects] = useState<BallProject[] | null>(null);
  const [discord, setDiscord] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [text, setText] = useState("");
  const [preview, setPreview] = useState<BallData | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [artMissing, setArtMissing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/guild/balls", { cache: "no-store" });
      if (response.status === 401) return router.refresh();
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar os projetos."));
      setMe(String(data.me));
      setProjects(data.projects as BallProject[]);
      setDiscord(data.discord === true);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar os projetos.");
    }
  }, [router]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  // Se o Pokémon já é um projeto salvo com arte enviada à mão, ela continua valendo sem precisar subir de novo.
  const existing = useMemo(() => (preview && projects ? projects.find((p) => ballSlug(p) === ballSlug(preview)) ?? null : null), [preview, projects]);
  const sprite = custom ?? existing?.sprite ?? null;
  const open = projects?.find((p) => p.id === openId) ?? null;

  function generate() {
    const data = parseBallText(text);
    setNotice(null);
    if (!data) {
      setPreview(null);
      return setNotice({ kind: "error", text: "Não achei o Pokémon e as balls nesse texto. Cole como copiou do jogo: o nome na primeira linha e “Ultra Ball: 492” nas seguintes." });
    }
    setArtMissing(false);
    setPreview(data);
  }

  async function pickSprite(file: File | undefined) {
    if (!file) return;
    try {
      setCustom(await shrinkSprite(file));
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Não consegui ler essa imagem." });
    }
  }

  async function save() {
    if (!preview) return;
    setBusy(true);
    setNotice(null);
    try {
      const png = await renderPng(preview, sprite);
      const form = new FormData();
      form.append("data", JSON.stringify(preview));
      form.append("image", png, "projeto.png");
      if (custom) form.append("sprite", custom);
      const response = await fetch("/api/guild/balls", { method: "POST", body: form });
      const data = await readJson(response);
      if (response.status === 401) router.refresh();
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
      const discordText = data.discord === "sent" ? " e avisei no Discord" : data.discord === "failed" ? ", mas não consegui avisar no Discord agora" : "";
      setNotice({ kind: data.discord === "failed" ? "error" : "ok", text: `Projeto salvo${discordText}!` });
      setText("");
      setPreview(null);
      setCustom(null);
      await load();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao salvar." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(project: BallProject) {
    if (!window.confirm(`Apagar o projeto ${title(project)} e todo o histórico dele?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/guild/balls", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: project.id }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível apagar."));
      setOpenId(null);
      await load();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao apagar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Projetos de balls" description="Cole os dados das balls do Pokémon para gerar a imagem. O projeto fica salvo aqui para a guilda acompanhar, e a imagem também vai para o Discord." />

      <section aria-labelledby="novo" className="mb-10">
        <h2 id="novo" className="mb-3 text-xl font-semibold tracking-tight">Atualizar um projeto</h2>
        <Card>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Cole o texto copiado do jogo</span>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Shiny Houndoom #229\nUltra Ball: 492\nMoon Ball: 1.174\n..."} className="min-h-36 w-full resize-y rounded-lg border border-line bg-raised p-3 font-mono text-xs text-fg placeholder:text-muted/60" />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={generate} disabled={!text.trim()} className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
              <Sparkles className="size-4" aria-hidden /> Gerar imagem
            </button>
            <label className={`${ghostButton} cursor-pointer`}>
              <ImagePlus className="size-4" aria-hidden /> {custom ? "Trocar arte do Pokémon" : "Arte do Pokémon (opcional)"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { void pickSprite(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            {custom && <button type="button" onClick={() => setCustom(null)} className={ghostButton}>Remover arte</button>}
          </div>

          {notice && (
            <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-3 flex items-start gap-1.5 text-sm ${notice.kind === "error" ? "text-red-300" : "text-teal"}`}>
              {notice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {notice.text}
            </p>
          )}

          {preview && (
            <div className="mt-5">
              <div className="mx-auto max-w-3xl">
                <BallCardCanvas data={preview} sprite={sprite} onLoaded={(a) => setArtMissing(!a.sprite && (!!preview.number || !!sprite))} />
              </div>
              {artMissing && <p className="mt-2 text-sm text-muted">Não consegui buscar a arte oficial do Pokémon. A imagem funciona assim mesmo; se quiser a arte, suba uma imagem no botão acima.</p>}
              <p className="mt-3 text-sm text-muted">
                {existing ? <>Esse Pokémon já é um projeto da guilda ({fmt(existing.total)} balls). Salvar vira uma nova atualização.</> : <>Projeto novo: {title(preview)} · {fmt(ballTotal(preview.balls))} balls.</>}{" "}
                {discord ? "A imagem também vai para o Discord." : "O Discord ainda não está configurado: só vai ficar salvo no site."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void save()} disabled={busy} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                  {busy ? "Salvando..." : "Salvar para a guilda"}
                </button>
                <button type="button" disabled={busy} onClick={() => void renderPng(preview, sprite).then((b) => download(b, title(preview)))} className={ghostButton}>
                  <Download className="size-4" aria-hidden /> Baixar imagem
                </button>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section aria-labelledby="galeria">
        <h2 id="galeria" className="mb-3 text-xl font-semibold tracking-tight">Projetos da guilda</h2>
        {loadError && !projects && <p role="alert" className="text-sm text-red-300">{loadError}</p>}
        {!projects && !loadError && <p className="text-sm text-muted">Carregando...</p>}
        {projects && projects.length === 0 && <p className="text-sm text-muted">Nenhum projeto salvo ainda. Gere o primeiro acima!</p>}
        {projects && projects.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <button key={p.id} type="button" onClick={() => setOpenId(p.id)} className="group rounded-xl border border-line bg-panel p-3 text-left transition-colors hover:border-gold/50 hover:bg-raised">
                <BallCardCanvas data={p} sprite={p.sprite} />
                <div className="mt-3 flex flex-wrap items-center gap-2 px-1">
                  <span className="font-semibold">{title(p)}</span>
                  <Delta value={delta(p)} />
                </div>
                <p className="mt-0.5 px-1 text-xs text-muted">{fmt(p.total)} balls · atualizado por {p.updatedBy ?? "?"} em {when(p.updatedAt)}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!open} onClose={() => setOpenId(null)} title={open ? title(open) : "Projeto"} size="wide">
        {open && (
          <div className="p-5 pr-14">
            <h2 className="text-xl font-semibold">{title(open)}</h2>
            <p className="mt-1 text-sm text-muted">Aberto por {open.createdBy ?? "?"} · {fmt(open.total)} balls</p>
            <div className="mt-4">
              <BallCardCanvas data={open} sprite={open.sprite} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void renderPng(open, open.sprite).then((b) => download(b, title(open)))} className={ghostButton}>
                <Download className="size-4" aria-hidden /> Baixar imagem
              </button>
              {open.createdBy === me && (
                <button type="button" disabled={busy} onClick={() => void remove(open)} className={`${ghostButton} hover:!text-red-300`}>
                  <Trash2 className="size-4" aria-hidden /> Apagar projeto
                </button>
              )}
            </div>
            <h3 className="mb-2 mt-6 flex items-center gap-2 text-sm font-semibold"><TrendingUp className="size-4 text-muted" aria-hidden /> Histórico de atualizações</h3>
            <ul className="space-y-1 text-sm">
              {open.history.map((h, i) => {
                const prev = open.history[i + 1];
                return (
                  <li key={`${h.at}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-line bg-raised px-3 py-1.5">
                    <span className="font-medium">{fmt(h.total)}</span>
                    {prev && <Delta value={h.total - prev.total} />}
                    <span className="text-muted">{h.by ?? "?"} · {when(h.at)}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Dialog>
    </>
  );
}
