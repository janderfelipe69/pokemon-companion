"use client";

import { useMemo, useState, type ClipboardEvent } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ballTotal, projectDays, shortDate, type BallCount, type BallData, type BallProject } from "@/config/guildBalls";
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

/** O projeto como fica depois da captura: cada ball da mensagem passa a valer o que o jogo informou. */
function afterCapture(project: BallProject | null, info: CaptureInfo, number: number | null): BallData {
  if (!project) return { pokemon: info.pokemon, number, shiny: info.shiny, balls: info.balls.map((b) => ({ ...b })) };
  const balls = project.balls.map((b) => ({ ...b }));
  for (const spent of info.balls) {
    const same = balls.find((b) => b.name.toLowerCase() === spent.name.toLowerCase());
    if (same) same.qty = spent.qty;
    else balls.push({ ...spent });
  }
  return { pokemon: project.pokemon, number: project.number, shiny: project.shiny, balls };
}

/** O que muda no projeto: "Premier Ball 634 → 685" e "Sora Ball (nova) 13". */
function changesOf(project: BallProject | null, spent: BallCount[]) {
  return spent.map((b) => {
    const before = project?.balls.find((p) => p.name.toLowerCase() === b.name.toLowerCase());
    return { name: b.name, from: before?.qty ?? null, to: b.qty };
  });
}

/** "Capturou?": cole o texto da mensagem de captura (ou um print dela), confira e encerre o projeto. */
export function CaptureForm({ projects, discord, onDone }: { projects: BallProject[]; discord: boolean; onDone: () => Promise<void> | void }) {
  const [text, setText] = useState("");
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [chosen, setChosen] = useState<number | "new" | null>(null);
  const [picked, setPicked] = useState("");
  const [lookedUp, setLookedUp] = useState<{ name: string; number: number | null } | null>(null);

  const info = useMemo(() => parseCaptureText(text), [text]);

  // Com qual ball foi a captura: a mensagem diz (Premier Catch / Alliance Ball Catch) ou a pessoa escolhe entre as usadas.
  const ball = info ? (info.ball ?? (info.choices.includes(picked) ? picked : null)) : null;
  const spent = info && ball ? (info.balls.find((b) => b.name === ball)?.qty ?? 0) : 0;
  const needsBall = !!info && !ball;

  const candidates = useMemo(() => (info ? projects.filter((p) => !p.capture && p.shiny === info.shiny && sameName(p.pokemon, info.pokemon)) : []), [info, projects]);
  // Um projeto aberto do mesmo Pokémon? Já vem escolhido. Vários? A pessoa escolhe.
  const projectId = chosen === "new" ? null : chosen ?? (candidates.length === 1 ? candidates[0].id : null);
  const project = candidates.find((c) => c.id === projectId) ?? null;
  const needsProject = candidates.length > 1 && chosen === null;
  const number = project?.number ?? (lookedUp && info && lookedUp.name === info.pokemon ? lookedUp.number : null);
  const final = useMemo(() => (info ? afterCapture(project, info, number) : null), [info, project, number]);

  // Dia 1 = primeiro post do projeto; a captura usa o horário da mensagem (ou agora, se a mensagem não trouxe).
  const capturedAt = info?.at ?? null;
  const capture: CardCapture | null = useMemo(
    () => (ball ? { ball, spent, startedAt: project?.createdAt ?? null, capturedAt: capturedAt ?? new Date().toISOString() } : null),
    [ball, spent, project, capturedAt],
  );
  const days = capture?.startedAt && capture.capturedAt ? projectDays(capture.startedAt, capture.capturedAt) : null;
  const changes = useMemo(() => (info ? changesOf(project, info.balls) : []), [info, project]);

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
    if (!info || !final || !ball || !capture) return;
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
      const png = await canvasToPng(drawBallCard(data, await loadCardAssets(data), undefined, capture));
      const form = new FormData();
      form.append("data", JSON.stringify({ projectId, pokemon: info.pokemon, number: dex, shiny: info.shiny, ball, balls: info.balls, capturedAt: info.at }));
      form.append("image", png, "projeto.png");
      const response = await fetch("/api/guild/balls/capture", { method: "POST", body: form });
      const result = (await response.json().catch(() => ({}))) as { error?: string; discord?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível registrar a captura.");
      const discordText = result.discord === "sent" ? " e comemorei no Discord" : result.discord === "failed" ? ", mas não consegui avisar no Discord agora" : "";
      setNotice({ kind: result.discord === "failed" ? "error" : "ok", text: `Captura registrada${discordText}! O projeto foi encerrado.` });
      setText("");
      setChosen(null);
      setPicked("");
      await onDone();
    } catch (e) {
      setNotice({ kind: "error", text: e instanceof Error ? e.message : "Erro ao registrar a captura." });
    } finally {
      setBusy(false);
    }
  }

  const showPreview = !!info && !!final && !!capture && !needsProject;

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
            placeholder={"Premier Catch\nVocê capturou um Pokémon! (Shiny Ninetales). Você gastou: 685 Premier Balls.\n\nou, sem título:\n09:28 Você capturou um Pokémon! (Shiny Pidgeot).\n09:28 Você gastou: 119 Premier Balls, 1 Ultra Ball e 13 Sora Balls."}
            className="min-h-32 w-full resize-y rounded-lg border border-line bg-raised p-3 font-mono text-xs text-fg placeholder:text-muted/60"
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
        {text.trim() && !info && !reading && !notice && <p className="mt-3 text-sm text-muted">Ainda não achei a mensagem de captura nesse texto. Ela tem as linhas “Você capturou um Pokémon! (Nome).” e “Você gastou: 685 Premier Balls.”</p>}

        {info && (
          <div className="mt-5 space-y-4">
            <dl className="grid gap-x-6 gap-y-2 rounded-lg border border-line bg-raised p-4 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Pokémon</dt><dd className="font-semibold">{info.shiny ? "✦ Shiny " : ""}{info.pokemon}</dd></div>
              <div><dt className="text-xs text-muted">Capturado na</dt><dd className="font-semibold">{ball ?? "escolha abaixo"}</dd></div>
              <div><dt className="text-xs text-muted">Balls gastas</dt><dd className="font-semibold">{info.balls.map((b) => `${fmt(b.qty)} ${b.name}`).join(" · ")}</dd></div>
            </dl>

            {needsBall && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs text-muted">
                  {info.choices.length < info.balls.length ? "A mensagem é “Rare Catch”: a captura foi na Ultra Ball ou numa ball elemental. Qual foi?" : "A mensagem não diz com qual ball foi a captura. Escolha uma das balls usadas."}
                </span>
                <select value={picked} onChange={(e) => setPicked(e.target.value)} className="w-full rounded-lg border border-line bg-raised px-3 py-2 text-sm text-fg sm:max-w-xs">
                  <option value="">Escolha a ball da captura...</option>
                  {info.choices.map((name) => <option key={name} value={name}>{name} ({fmt(info.balls.find((b) => b.name === name)?.qty ?? 0)} gastas)</option>)}
                </select>
              </label>
            )}

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
                  <div className="text-muted">
                    <p>
                      Vai encerrar o projeto <b className="text-fg">{project.pokemon}{project.number ? ` #${project.number}` : ""}</b>. O jogo informou estas quantidades, que passam a valer:
                    </p>
                    <ul className="my-1.5 ml-4 list-disc">
                      {changes.map((c) => (
                        <li key={c.name}>
                          <b className="text-fg">{c.name}</b>: {c.from === null ? <>nova, {fmt(c.to)}</> : c.from === c.to ? <>continua {fmt(c.to)}</> : <>{fmt(c.from)} → <b className="text-fg">{fmt(c.to)}</b></>}
                        </li>
                      ))}
                    </ul>
                    {final && <p>Total final: <b className="text-fg">{fmt(ballTotal(final.balls))}</b> balls.{days && capture?.startedAt ? <> Projeto aberto em <b className="text-fg">{shortDate(capture.startedAt)}</b>: <b className="text-fg">{days} {days === 1 ? "dia" : "dias"}</b> até a captura.</> : null}</p>}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted">Não há projeto aberto de {info.shiny ? "Shiny " : ""}{info.pokemon}. Vai ser registrado direto como capturado, com as balls da mensagem.</p>
            )}

            {showPreview && (
              <>
                <div className="mx-auto max-w-3xl">
                  <BallCardCanvas data={final!} capture={capture} />
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
