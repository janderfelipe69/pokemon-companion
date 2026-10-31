"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { BannerPicker } from "@/components/guild/banner/BannerPicker";
import { MAX_GUILD_LEVEL, bannerById, bannerImage } from "@/config/guildBanners";

type Saved = { banner: string; level: number };

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

/** Banner da guilda: só o admin troca. Mostra o que está em uso e deixa escolher entre os liberados pelo nível da guilda. */
export function GuildBannerManager() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [banner, setBanner] = useState("");
  const [level, setLevel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/guild-banner", { cache: "no-store" });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível carregar o banner."));
      const next = { banner: String(data.banner), level: Number(data.level) };
      setSaved(next);
      setBanner(next.banner);
      setLevel(String(next.level));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const levelNumber = /^\d+$/.test(level.trim()) ? Number(level) : null;
  const chosen = bannerById(banner);
  const lockedPick = chosen && levelNumber !== null && levelNumber < chosen.unlock;
  const dirty = !!saved && (banner !== saved.banner || levelNumber !== saved.level);
  const current = saved ? bannerById(saved.banner) : null;

  async function save() {
    if (levelNumber === null) return setError(`Digite o nível da guilda (número inteiro de 0 a ${MAX_GUILD_LEVEL}).`);
    setBusy(true);
    setError("");
    setOk("");
    try {
      const response = await fetch("/api/admin/guild-banner", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ banner, level: levelNumber }) });
      const data = await readJson(response);
      if (!response.ok) throw new Error(String(data.error || "Não foi possível salvar."));
      setOk(`Pronto! O banner da guilda agora é ${chosen?.name}, com a guilda no nível ${levelNumber}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="banner-title" className="space-y-6">
      <div>
        <h2 id="banner-title" className="text-xl font-semibold">Banner da guilda</h2>
        <p className="mt-1 text-sm text-muted">Escolha o banner que a guilda usa. Os banners liberam conforme o nível da guilda: a 1ª fase desde o nível 0, a 2ª no nível 11 e a última no nível 16. Só você troca; os membros apenas veem.</p>
      </div>

      {error && !saved && <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}</p>}
      {!saved && !error && <p className="text-sm text-muted">Carregando...</p>}

      {saved && (
        <>
          <Card className="flex flex-wrap items-center gap-5">
            {current && (
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
                <img src={bannerImage(current.id)} alt="" width={80} height={80} className="size-20 object-contain" />
                <div>
                  <p className="text-xs text-muted">Em uso agora</p>
                  <p className="text-xl font-semibold text-gold">{current.name}</p>
                  <p className="text-sm text-muted">Guilda no nível {saved.level}</p>
                </div>
              </div>
            )}
            <label className="ml-auto block">
              <span className="mb-1 block text-xs text-muted">Nível da guilda</span>
              <input inputMode="numeric" value={level} onChange={(e) => { setLevel(e.target.value); setOk(""); }} className="w-28 rounded-lg border border-line bg-raised px-3 py-2 text-center text-sm text-fg" />
            </label>
          </Card>

          <BannerPicker level={levelNumber ?? saved.level} active={saved.banner} selected={banner} onSelect={(id) => { setBanner(id); setOk(""); setError(""); }} disabled={busy} />

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => void save()} disabled={busy || !dirty || !!lockedPick} className="rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-ink hover:opacity-90 disabled:opacity-40">
              {busy ? "Salvando..." : "Salvar"}
            </button>
            {dirty && <button type="button" onClick={() => { setBanner(saved.banner); setLevel(String(saved.level)); setError(""); }} className="rounded-lg border border-line px-3 py-2.5 text-sm text-muted hover:text-fg">Desfazer</button>}
            {lockedPick && chosen && <span className="text-sm text-gold">{chosen.name} só libera no nível {chosen.unlock}. Aumente o nível da guilda ou escolha outro banner.</span>}
          </div>
          {ok && <p role="status" className="flex items-start gap-1.5 text-sm text-teal"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden /> {ok}</p>}
          {error && <p role="alert" className="flex items-start gap-1.5 text-sm text-red-300"><AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> {error}</p>}
        </>
      )}
    </section>
  );
}
