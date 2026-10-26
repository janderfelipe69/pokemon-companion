import { Gem, Package, Users, type LucideIcon } from "lucide-react";
import { HomeShortcut } from "@/components/home/HomeShortcut";
import { PageHeader } from "@/components/ui/PageHeader";
import type { NavItem } from "@/config/navigation";

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
];

export default function GuildHubPage() {
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
