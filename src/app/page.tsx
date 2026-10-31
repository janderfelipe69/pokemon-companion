import { GUILD } from "@/config/guild";
import { mainNav, type NavItem } from "@/config/navigation";
import { HomeShortcut, type Accent } from "@/components/home/HomeShortcut";
import { Pokeball } from "@/components/ui/Pokeball";
import { TypeStrip } from "@/components/ui/TypeStrip";

/** As balls da guilda (ícones em /public/guild/balls), mostradas como enfeite na página inicial. */
const BALLS = ["premier", "ultra", "moon", "alliance", "yume", "sora", "magu", "fast", "heavy", "net", "dusk", "tale", "tinker", "janguru"];

/** Como os atalhos são agrupados na página inicial (pelo endereço de cada página). */
const groups: { title: string; hint: string; accent: Accent; hrefs: string[] }[] = [
  {
    title: "Consultar",
    hint: "Informações do jogo sempre à mão",
    accent: "gold",
    hrefs: ["/pokedex", "/medalhas", "/tiers", "/drops", "/rotas-farm", "/linked-tasks"],
  },
  {
    title: "Ferramentas da guilda",
    hint: "Para planejar e acompanhar",
    accent: "teal",
    hrefs: ["/guilda", "/montador-times", "/teste-de-dano", "/custo-de-star", "/pokelog"],
  },
];

export default function HomePage() {
  // Só páginas abertas a todos (as restritas ao admin aparecem no menu, para quem está logado).
  const available = mainNav.filter((item) => item.href !== "/" && !item.adminOnly);
  const byHref = new Map(available.map((item) => [item.href, item]));
  const placed = new Set(groups.flatMap((g) => g.hrefs));
  // Páginas novas que ainda não entraram em nenhum grupo não ficam de fora.
  const others = available.filter((item) => !placed.has(item.href));

  const sections = [
    ...groups.map((g) => ({ ...g, items: g.hrefs.map((h) => byHref.get(h)).filter((i): i is NavItem => !!i) })),
    ...(others.length > 0 ? [{ title: "Outros", hint: "", accent: "gold" as Accent, hrefs: [], items: others }] : []),
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-raised via-panel to-ink px-6 py-10 sm:px-10 sm:py-14">
        {/* Brilhos decorativos de fundo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(42rem_18rem_at_92%_0%,rgba(242,184,75,0.13),transparent),radial-gradient(34rem_16rem_at_18%_110%,rgba(67,208,180,0.09),transparent)]"
        />

        {/* Uma Pokébola gigante de contorno, girando devagar, no canto. */}
        <Pokeball variant="line" className="pb-spin-slow pointer-events-none absolute -bottom-20 -right-16 size-72 text-gold/[0.06] sm:size-96" />
        <TypeStrip className="absolute inset-x-0 bottom-0 h-1" />

        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:gap-10 sm:text-left">
          <div className="relative shrink-0">
            <span aria-hidden className="absolute inset-0 rounded-full bg-gold/30 blur-2xl" />
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
            <img
              src={GUILD.emblem}
              alt={`Emblema da guilda ${GUILD.name}`}
              width={144}
              height={144}
              className="relative size-28 rounded-full shadow-xl shadow-black/40 sm:size-36"
            />
          </div>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-gold">Seja bem-vindo à</p>
            <h1 className="mt-1 bg-gradient-to-r from-gold to-amber-100 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
              {GUILD.name}
            </h1>
            <p className="mt-4 max-w-xl text-muted">
              Tudo o que a guilda precisa para consultar, planejar e evoluir, num só lugar. Escolha por onde começar.
            </p>
            <ul aria-hidden className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {BALLS.map((ball) => (
                <li key={ball} className="pb-wiggle origin-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- ícone local pequeno e fixo */}
                  <img src={`/guild/balls/${ball}.png`} alt="" width={36} height={36} loading="lazy" className="size-8 rounded-full shadow-md shadow-black/50 ring-1 ring-white/10 sm:size-9" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {sections.map((section, i) => (
        <section key={section.title} aria-labelledby={`grupo-${i}`}>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id={`grupo-${i}`} className="text-xl font-semibold tracking-tight">
              {section.title}
            </h2>
            {section.hint && <p className="text-sm text-muted">{section.hint}</p>}
          </div>
          <div className={`grid gap-3 sm:gap-4 sm:grid-cols-2 ${section.items.length >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"}`}>
            {section.items.map((item) => (
              <HomeShortcut key={item.href} item={item} accent={section.accent} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
