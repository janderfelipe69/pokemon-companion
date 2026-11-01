import {
  Home,
  BookOpen,
  Layers,
  Sparkles,
  ScrollText,
  Map,
  Swords,
  Gauge,
  Trophy,
  Gem,
  ListOrdered,
  Star,
  Medal,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/** As seções do menu lateral e da página inicial. */
export type NavGroup = "guilda" | "consultar" | "ferramentas";

export const NAV_GROUPS: { key: NavGroup; label: string; hint: string }[] = [
  { key: "guilda", label: "Guilda", hint: "Tudo da guilda num só lugar" },
  { key: "consultar", label: "Consultar", hint: "Informações do jogo sempre à mão" },
  { key: "ferramentas", label: "Ferramentas", hint: "Para planejar e calcular" },
];

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Em qual seção do menu aparece (sem seção = solto no topo). */
  group?: NavGroup;
  /** Só aparece no menu (e só abre) para quem está logado na Administração. */
  adminOnly?: boolean;
  /**
   * Em construção: some do menu e da página inicial até ficar pronto. A página continua existindo (só não tem link).
   * Para ligar de novo, é só apagar o `hidden: true` do item.
   */
  hidden?: boolean;
};

export const mainNav: NavItem[] = [
  { href: "/", label: "Início", description: "Boas-vindas e atalhos", icon: Home },

  { href: "/guilda", label: "Guilda", description: "Boosts, trocas, clones, projetos e banner (só para membros)", icon: Gem, group: "guilda" },
  { href: "/linked-tasks", label: "Linked Tasks", description: "Tarefas em ordem: mobs, Pokémon e tipo de hunt", icon: ListOrdered, group: "guilda" },
  { href: "/quadro-guilda", label: "Quadro da guilda", description: "Progresso semanal da guilda em imagem", icon: Trophy, group: "guilda", adminOnly: true },

  { href: "/pokedex", label: "Pokédex", description: "Consulte os Pokémon e seus dados", icon: BookOpen, group: "consultar" },
  { href: "/medalhas", label: "Medalhas", description: "O que cada medalha dá e presets por buff", icon: Medal, group: "consultar" },
  { href: "/tiers", label: "Tiers e valores", description: "Classificações e valores de referência", icon: Layers, group: "consultar" },
  { href: "/drops", label: "Drops de talentos", description: "Origem e chances de talentos", icon: Sparkles, group: "consultar" },
  { href: "/rotas-farm", label: "Rotas de farm", description: "Sugestões de locais para farmar", icon: Map, group: "consultar", hidden: true },

  { href: "/montador-times", label: "Montador de times", description: "Monte times que batem a efetividade do alvo", icon: Swords, group: "ferramentas" },
  { href: "/teste-de-dano", label: "Teste de dano", description: "Divida a rotação e veja até que hazard vai", icon: Gauge, group: "ferramentas" },
  { href: "/custo-de-star", label: "Custo de Star", description: "Calcule o custo para subir as stars do Pokémon", icon: Star, group: "ferramentas" },
  { href: "/pokelog", label: "Pokélog", description: "Registro de capturas e eventos", icon: ScrollText, group: "ferramentas", hidden: true },
];

export const adminNav: NavItem = {
  href: "/admin",
  label: "Administração",
  description: "Área restrita de gerenciamento",
  icon: ShieldCheck,
};

export const allNav: NavItem[] = [...mainNav, adminNav];

/** Os itens que aparecem de verdade (sem os em construção). */
export const visibleNav: NavItem[] = mainNav.filter((item) => !item.hidden);
