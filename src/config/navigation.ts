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

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Só aparece no menu (e só abre) para quem está logado na Administração. */
  adminOnly?: boolean;
};

export const mainNav: NavItem[] = [
  { href: "/", label: "Início", description: "Boas-vindas e atalhos", icon: Home },
  { href: "/pokedex", label: "Pokédex", description: "Consulte os Pokémon e seus dados", icon: BookOpen },
  { href: "/medalhas", label: "Medalhas", description: "O que cada medalha dá e presets por buff", icon: Medal },
  { href: "/tiers", label: "Tiers e valores", description: "Classificações e valores de referência", icon: Layers },
  { href: "/drops", label: "Drops de talentos", description: "Origem e chances de talentos", icon: Sparkles },
  { href: "/pokelog", label: "Pokélog", description: "Registro de capturas e eventos", icon: ScrollText },
  { href: "/rotas-farm", label: "Rotas de farm", description: "Sugestões de locais para farmar", icon: Map },
  { href: "/linked-tasks", label: "Linked Tasks", description: "Tarefas em ordem: mobs, Pokémon e tipo de hunt", icon: ListOrdered },
  { href: "/montador-times", label: "Montador de times", description: "Monte e compare seus times", icon: Swords },
  { href: "/teste-de-dano", label: "Teste de dano", description: "Divida a rotação e veja até que hazard vai", icon: Gauge },
  { href: "/custo-de-star", label: "Custo de Star", description: "Calcule o custo para subir as stars do Pokémon", icon: Star },
  { href: "/guilda", label: "Guilda", description: "Boosts, trocas e times de clones (só para membros)", icon: Gem },
  { href: "/quadro-guilda", label: "Quadro da guilda", description: "Progresso semanal da guilda em imagem", icon: Trophy, adminOnly: true },
];

export const adminNav: NavItem = {
  href: "/admin",
  label: "Administração",
  description: "Área restrita de gerenciamento",
  icon: ShieldCheck,
};

export const allNav: NavItem[] = [...mainNav, adminNav];
