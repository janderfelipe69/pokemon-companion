import { Flag, Gem, Package, Target, Users, type LucideIcon } from "lucide-react";
import { HomeShortcut } from "@/components/home/HomeShortcut";
import { PageHeader } from "@/components/ui/PageHeader";
import { bannerById } from "@/config/guildBanners";
import type { NavItem } from "@/config/navigation";
import { getGuildSettings } from "@/lib/guild/guildSettings";

/** Para ganhar uma nova função na guilda, é só somar um item aqui e criar a página em app/guilda/(membro)/. */
const item = (href: string, label: string, description: string, icon: LucideIcon): NavItem => ({ href, label, description, icon });

const baseSections = [
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
  // O card do banner já diz qual está em uso. Se o banco não responder, o card fica só com o texto padrão.
  let bannerText = "Qual banner a guilda usa e quais já estão liberados";
  try {
    const settings = await getGuildSettings();
    const banner = bannerById(settings.banner);
    if (banner) bannerText = `Em uso: ${banner.name} · guilda no nível ${settings.level}`;
  } catch {
    /* segue com o texto padrão */
  }
  const sections = [
    ...baseSections,
    { title: "Guilda", hint: "Informações da guilda", accent: "gold" as const, items: [item("/guilda/banner", "Banner da guilda", bannerText, Flag)] },
  ];

  return (
    <div className="space-y-10">
      <PageHeader title="Guilda" description="Tudo o que é só dos membros: boosts, trocas de stones e times para as missões." />
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
