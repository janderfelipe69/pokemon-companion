"use client";

import { useMemo, useState, type ClipboardEvent } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ballTotal, projectDays, shortDate, type BallData, type BallProject } from "@/config/guildBalls";
import { canvasToPng, drawBallCard, loadCardAssets, type CardCapture } from "@/lib/guild/ballsImage";
import { parseCaptureText, sameName, type CaptureInfo } from "@/lib/guild/captureParse";
import { BallCardCanvas } from "./BallCardCanvas";

type Notice = { kind: "ok" | "error"; text: string };
const ghostButton = "inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-muted hover:text-fg disabled:opacity-40";
const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Número do Pokémon na PokéAPI (só para achar a arte). Falhou? Segue sem arte. */
async function lookupDexNumber(name: string): Promise<number | null> {
  const slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.']/g, "").replace(/\s+/g, "-");
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(slug)}`);
    if (!response.ok) return null;
    const id = ((await response.json()) as { id?: unknown }).id;
    return Number.isInteger(id) ? (id as number) : null;
  } catch {
    return null;
  }
}

/** O projeto como fica depois da captura: a quantidade da ball usada passa a ser a que o jogo informou. */
function afterCapture(project: BallProject | null, info: CaptureInfo, number: number | null): BallData {
  if (!project) return { pokemon: info.pokemon, number, shiny: info.shiny, balls: [{ name: info.ball, qty: info.spent }] };
  const balls = project.balls.map((b) => ({ ...b }));
  const same = balls.find((b) => b.name.toLowerCase() === info.ball.toLowerCase());
  if (same) same.qty = info.spent;
  else balls.push({ name: info.ball, qty: info.spent });
  return { pokemon: project.pokemon, number: project.number, shiny: project.shiny, balls };
}

/** "Capturou?": cole o texto da mensagem de captura (ou um print dela), confira e encerre o projeto. */
export function CaptureForm({ projects, discord, onDone }: { projects: BallProject[]; discord: boolean; onDone: () => Promise<void> | void }) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [chosen, setChosen] = useState<number | "new" | null>(null);
  const [lookedUp, setLookedUp] = useState<{ name: string; number: number | null } | null>(null);

  const info = useMemo(() => parseCaptureText(text), [text]);
  const candidates = useMemo(() => (info ? projects.filter((p) => !p.capture && p.shiny === info.shiny && sameName(p.pokemon, info.pokemon)) : []), [info, projects]);
  // Um projeto aberto do mesmo Pokémon? Já vem escolhido. Vários? A pessoa escolhe.
  const projectId = chosen === "new" ? null : chosen ?? (candidates.length === 1 ? candidates[0].id : null);
  const project = candidates.find((c) => c.id === projectId) ?? null;
  const needsChoice = candidates.length > 1 && chosen === null;
  const number = project?.number ?? (lookedUp && info && lookedUp.name === info.pokemon ? lookedUp.number : null);
  const final = useMemo(() => (info ? afterCapture(project, info, number) : null), [info, project, number]);
  // Dia 1 = primeiro post do projeto; a captura usa o horário da mensagem (ou agora, se a mensagem não trouxe).
  const capturedAt = info?.at ?? null;
  const capture: CardCapture | null = useMemo(
    () => (info ? { ball: info.ball, spent: info.spent, startedAt: project?.createdAt ?? null, capturedAt: capturedAt ?? new Date().toISOString() } : null),
    [info, project, capturedAt],
  );
  const days = capture?.startedAt && capture.capturedAt ? projectDays(capture.startedAt, capture.capturedAt) : null;

  async function readImage(file: Blob | null | undefined) {
    if (!file) return;
    setReading(true);
    setNotice(null);
    try {
      const { readImageText } = await import("@/lib/guild/captureOcr");
      const read = await readImageText(file);
      setText(read.trim());
      setChosen(null);
      if (!parseCaptureText(read)) setNotice({ kind: "error", text: "Li a imagem, mas não achei a mensagem de captura. Confira o texto abaixo (dá para corrigir à mão) ou cole o texto da mensagem." });
    } catch {
      setNotice({ kind: "error", text: "Não consegui ler a imagem. Cole o texto da mensagem em vez dela." });
    } finally {
      setReading(false);
    }
  }

  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const image = [...event.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (image) {
      event.preventDefault();
      void readImage(image);
    }
  }

  async function confirm() {
    if (!info || !final) return;
    setBusy(true);
    setNotice(null);
    try {
      // Sem projeto e sem número da dex: tenta achar o número só para a arte do Pokémon.
      let dex = number;
      if (!project && dex === null) {
        dex = await lookupDexNumber(info.pokemon);
        setLookedUp({ name: info.pokemon, number: dex });
      }
      const data: BallData = { ...final, number: dex };
      const png = await canvasToPng(drawBallCard(data, await loadCardAssets(data, project?.sprite ?? null), undefined, capture));
      const form = new FormData();
      form.append("data", JSON.stringify({ projectId, pokemon: info.pokemon, number: dex, shiny: info.shiny, ball: info.ball, spent: info.spent, capturedAt: info.at }));
      form.append("image", png, "projeto.png");
      const response = await fetch("/api/guild/balls/capture", { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as { error?: string; discord?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar a captura.");
      const discordText = result.discord === "sent" ? " e comemorei no Discord" : result.discord === "failed" ? ", mas não consegui avisar no Discord agora" : "";
      setNotice({ kind: result.discord === "failed" ? "error" : "ok", text: `Captura registrada${discordText}! O projeto foi encerrado.` });
      setText("");
      setChosen(null);
      await onDone();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao registrar a captura." });
    } finally {
      setBusy(false);
    }
  }

  const previousBall = project?.balls.find((b) => info && b.name.toLowerCase() === info.ball.toLowerCase());

  return (
    <section aria-labelledby="captura" className="mb-10">
      <h2 id="captura" className="mb-3 flex items-center gap-2 text-xl font-semibold tracking-tight">
        <PartyPopper className="size-5 text-teal" aria-hidden /> Capturou? Encerre o projeto
      </h2>
      <Card>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Cole o texto da mensagem de captura ou um print dela</span>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setChosen(null); }}
            onPaste={onPaste}
            placeholder={"Premier Catch\nVocê capturou um Pokémon! (Shiny Ninetales). Você gastou: 685 Premier Balls."}
            className="min-h-28 w-full resize-y rounded-lg border border-line bg-raised p-3 font-mono text-xs text-fg placeholder:text-muted/60"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className={`${ghostButton} cursor-pointer`}>
            <ImagePlus className="size-4" aria-hidden /> {reading ? "Lendo a imagem..." : "Enviar print"}
            <input type="file" accept="image/*" disabled={reading} className="sr-only" onChange={(e) => { void readImage(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <span className="text-xs text-muted">Dá para colar o print direto na caixa (Ctrl+V). A leitura da imagem pode errar: confira o texto que aparecer.</span>
        </div>

        {notice && (
          <p role={notice.kind === "error" ? "alert" : "status"} className={`mt-3 flex items-start gap-1.5 text-sm ${notice.kind === "error" ? "text-red-300" : "text-teal"}`}>
            {notice.kind === "error" ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />} {notice.text}
          </p>
        )}
        {text.trim() && !info && !reading && !notice && <p className="mt-3 text-sm text-muted">Ainda não achei a mensagem de captura nesse texto. Ela tem o formato “Você capturou um Pokémon! (Nome). Você gastou: 685 Premier Balls.”</p>}

        {info && final && (
          <div className="mt-5 space-y-4">
            <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-line bg-raised p-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Pokémon</dt><dd className="font-semibold">{info.shiny ? "✦ Shiny " : ""}{info.pokemon}</dd></div>
              <div><dt className="text-xs text-muted">Capturado na</dt><dd className="font-semibold">{info.ball}</dd></div>
              <div><dt className="text-xs text-muted">Balls gastas</dt><dd className="font-semibold">{fmt(info.spent)}</dd></div>
            </dl>

            {candidates.length > 0 ? (
              <div className="text-sm">
                {candidates.length > 1 && (
                  <label className="mb-2 block">
                    <span className="mb-1 block text-xs text-muted">Há mais de um projeto aberto desse Pokémon. Qual foi capturado?</span>
                    <select value={chosen ?? ""} onChange={(e) => setChosen(e.target.value === "new" ? "new" : e.target.value ? Number(e.target.value) : null)} className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg">
                      <option value="">Escolha...</option>
                      {candidates.map((c) => <option key={c.id} value={c.id}>{c.pokemon}{c.number ? ` #${c.number}` : ""} · {fmt(c.total)} balls</option>)}
                      <option value="new">Nenhum desses (registrar como projeto novo)</option>
                    </select>
                  </label>
                )}
                {project && (
                  <p className="text-muted">
                    Vai encerrar o projeto <b className="text-fg">{project.pokemon}{project.number ? ` #${project.number}` : ""}</b>
                    {previousBall ? <>: a {info.ball} passa de <b className="text-fg">{fmt(previousBall.qty)}</b> para <b className="text-fg">{fmt(info.spent)}</b> (o que o jogo informou).</> : <>, incluindo a {info.ball} com {fmt(info.spent)}.</>} Total final: <b className="text-fg">{fmt(ballTotal(final.balls))}</b> balls.{days && capture?.startedAt ? <> Projeto aberto em <b className="text-fg">{shortDate(capture.startedAt)}</b>: <b className="text-fg">{days} {days === 1 ? "dia" : "dias"}</b> até a captura.</> : null}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Não há projeto aberto de {info.shiny ? "Shiny " : ""}{info.pokemon}. Vai ser registrado direto como capturado, só com a {info.ball}.</p>
            )}

            {!needsChoice && (
              <>
                <div className="mx-auto max-w-3xl">
                  <BallCardCanvas data={final} sprite={project?.sprite ?? null} capture={capture} />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => void confirm()} disabled={busy} className="rounded-lg bg-teal px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
                    {busy ? "Registrando..." : "Confirmar captura"}
                  </button>
                  <span className="text-xs text-muted">{discord ? "A imagem do projeto encerrado também vai para o Discord." : "O Discord ainda não está configurado: só vai ficar salvo no site."}</span>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}
