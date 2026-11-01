import Link from "next/link";
import { ArrowRight, Gem, Package, Target, Users, type LucideIcon } from "lucide-react";
import { HomeShortcut } from "@/components/home/HomeShortcut";
import { PageHeader } from "@/components/ui/PageHeader";
import { GUILD } from "@/config/guild";
import type { NavItem } from "@/config/navigation";
import { getGuildEmblem } from "@/lib/guild/guildEmblem";

/** Para ganhar uma nova função na guilda, é só somar um item aqui e criar a página em app/guilda/(membro)/. */
const item = (href: string, label: string, description: string, icon: LucideIcon): NavItem => ({ href, label, description, icon });

const sections = [
  {
    title: "Boosts",
    hint: "Stones do boss da guilda",
    accent: "gold" as const,
    items: [
      item("/guilda/boosts", "Meus boosts", "Escolha os tipos e níveis de stone que você quer receber", Gem),
      item("/guilda/drops", "Drops do boss", "Cole o log, publique e veja o plano de trocas", Package),
    ],
  },
  {
    title: "Missões",
    hint: "Monte time com o pessoal da guilda",
    accent: "teal" as const,
    items: [item("/guilda/clones", "Times de clones", "Procure ou entre em um time de 4 (Easy, Medium e Hard)", Users)],
  },
  {
    title: "Projetos",
    hint: "Acompanhe o que a guilda está farmando",
    accent: "gold" as const,
    items: [item("/guilda/projetos", "Projetos de balls", "Cole os dados, gere a imagem e mantenha a guilda atualizada", Target)],
  },
];

export default async function GuildHubPage() {
  const emblem = await getGuildEmblem();

  return (
    <div className="space-y-10">
      <PageHeader title="Guilda" description="Tudo o que é só dos membros: boosts, trocas de stones e times para as missões." />

      {/* O banner que a guilda usa hoje (quem troca é só o admin). */}
      <Link href="/guilda/banner" className="group flex items-center gap-5 rounded-2xl border border-gold/30 bg-gradient-to-r from-raised via-panel to-panel p-4 transition-colors hover:border-gold/60 sm:p-5">
        <span className="grid size-20 shrink-0 place-items-center rounded-full border-[3px] border-gold/80 bg-gradient-to-b from-raised to-ink shadow-lg shadow-black/40 sm:size-24">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
          <img src={emblem.src} alt="" width={96} height={96} className={emblem.banner ? "size-[88%] object-contain" : "size-full rounded-full object-cover"} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium uppercase tracking-[0.2em] text-gold">{GUILD.name}</span>
          <span className="mt-0.5 block text-xl font-semibold tracking-tight sm:text-2xl">{emblem.banner ? `Banner: ${emblem.banner.name}` : "Banner da guilda"}</span>
          <span className="mt-0.5 block text-sm text-muted">{emblem.level !== null ? `Guilda no nível ${emblem.level} · ver todos os banners` : "Ver os banners da guilda"}</span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-gold" aria-hidden />
      </Link>
      {sections.map((section, i) => (
        <section key={section.title} aria-labelledby={`guilda-${i}`}>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id={`guilda-${i}`} className="text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            <p className="text-sm text-muted">{section.hint}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {section.items.map((it) => (
              <HomeShortcut key={it.href} item={it} accent={section.accent} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
