import { GUILD } from "@/config/guild";
import { NAV_GROUPS, visibleNav, type NavGroup } from "@/config/navigation";
import { HomeShortcut, type Accent } from "@/components/home/HomeShortcut";
import { Pokeball } from "@/components/ui/Pokeball";
import { TypeStrip } from "@/components/ui/TypeStrip";
import { getGuildEmblem } from "@/lib/guild/guildEmblem";

/** O banner da guilda vem do banco: a página se refaz sozinha de tempos em tempos, e na hora quando o admin troca o banner. */
export const revalidate = 300;

/** As balls da guilda (ícones em /public/guild/balls), mostradas como enfeite na página inicial. */
const BALLS = ["premier", "ultra", "moon", "alliance", "yume", "sora", "magu", "fast", "heavy", "net", "dusk", "tale", "tinker", "janguru"];

/** Cor de destaque de cada seção da página inicial. */
const ACCENT: Record<NavGroup, Accent> = { guilda: "gold", consultar: "teal", ferramentas: "gold" };

export default async function HomePage() {
  const emblem = await getGuildEmblem();
  // As seções e os atalhos vêm do menu (config/navigation.ts): o que está em construção (hidden) e o que é só do admin ficam de fora.
  const sections = NAV_GROUPS.map((group) => ({
    ...group,
    accent: ACCENT[group.key],
    items: visibleNav.filter((item) => item.group === group.key && !item.adminOnly),
  })).filter((section) => section.items.length > 0);

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
            {emblem.banner ? (
              // O banner da guilda é um rostinho com fundo transparente: ganha um anel dourado e um fundo escuro, como o emblema antigo.
              <div className="relative grid size-28 place-items-center rounded-full border-[3px] border-gold/80 bg-gradient-to-b from-raised to-ink shadow-xl shadow-black/40 sm:size-36">
                {/* eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa */}
                <img src={emblem.src} alt={`Banner da guilda: ${emblem.banner.name}`} width={128} height={128} className="size-[88%] object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- imagem local pequena e fixa
              <img src={emblem.src} alt={`Emblema da guilda ${GUILD.name}`} width={144} height={144} className="relative size-28 rounded-full shadow-xl shadow-black/40 sm:size-36" />
            )}
            {emblem.banner && emblem.level !== null && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/60 bg-ink px-3 py-0.5 text-xs font-semibold text-gold">Nível {emblem.level}</span>
            )}
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
        <section key={section.label} aria-labelledby={`grupo-${i}`}>
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id={`grupo-${i}`} className="text-xl font-semibold tracking-tight">
              {section.label}
            </h2>
            <p className="text-sm text-muted">{section.hint}</p>
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
