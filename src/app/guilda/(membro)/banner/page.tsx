import { redirect } from "next/navigation";
import { BannerPicker } from "@/components/guild/banner/BannerPicker";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { bannerById, bannerImage, unlockLabel } from "@/config/guildBanners";
import { getCurrentMember } from "@/lib/guild/currentMember";
import { GuildSettingsError, getGuildSettings, type GuildSettings } from "@/lib/guild/guildSettings";

export const dynamic = "force-dynamic";

export default async function GuildBannerPage() {
  if (!(await getCurrentMember())) redirect("/guilda"); // o layout mostra a tela de entrada

  let settings: GuildSettings | null = null;
  let problem = "";
  try {
    settings = await getGuildSettings();
  } catch (e) {
    problem = e instanceof GuildSettingsError ? e.message : "Não foi possível carregar o banner da guilda.";
  }
  const current = settings ? bannerById(settings.banner) : undefined;

  return (
    <>
      <PageHeader title="Banner da guilda" description="O banner que a guilda usa e quais já estão liberados. Os banners liberam conforme a guilda sobe de nível." />
      {problem || !settings || !current ? (
        <p role="alert" className="text-sm text-red-300">{problem || "Banner indisponível."}</p>
      ) : (
        <div className="space-y-8">
          <Card className="flex flex-wrap items-center gap-6 border-gold/30">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
            <img src={bannerImage(current.id)} alt="" width={112} height={112} className="size-28 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.5)]" />
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gold">Banner em uso</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{current.name}</p>
              <p className="mt-1 text-sm text-muted">Guilda no nível <b className="text-fg">{settings.level}</b> · {unlockLabel(current).toLowerCase()}</p>
            </div>
          </Card>
          <section aria-labelledby="todos-banners">
            <h2 id="todos-banners" className="mb-1 text-xl font-semibold tracking-tight">Todos os banners</h2>
            <p className="mb-4 text-sm text-muted">Só o administrador troca o banner. Os bloqueados liberam quando a guilda chega ao nível indicado.</p>
            <BannerPicker level={settings.level} active={settings.banner} />
          </section>
        </div>
      )}
    </>
  );
}
