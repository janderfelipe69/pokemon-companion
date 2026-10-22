import type { Pokemon } from "@/types/pokemon";

/**
 * DADOS DE DEMONSTRAÇÃO.
 * Nomes e tipos são fictícios e não representam informações do jogo.
 * Serão substituídos pelos dados reais em uma etapa futura.
 */
export const demoPokemon: Pokemon[] = [
  { id: "demo-001", name: "Brasinha Demo", defensiveTypes: ["fire"], offensiveTypes: ["fire"], isDemo: true },
  {
    id: "demo-002",
    name: "Brasinha Demo",
    variant: "Shiny",
    defensiveTypes: ["fire"],
    offensiveTypes: ["fire", "dragon"],
    notes: "Exemplo: variante com tipos ofensivos diferentes dos defensivos.",
    isDemo: true,
  },
  { id: "demo-003", name: "Marzinho Demo", defensiveTypes: ["water"], offensiveTypes: ["water", "ice"], isDemo: true },
  {
    id: "demo-004",
    name: "Folhudo Demo",
    defensiveTypes: ["grass", "poison"],
    offensiveTypes: ["grass"],
    notes: "Exemplo: dois tipos defensivos e um ofensivo.",
    isDemo: true,
  },
  { id: "demo-005", name: "Faiscão Demo", defensiveTypes: ["electric"], offensiveTypes: ["electric", "steel"], isDemo: true },
  { id: "demo-006", name: "Faiscão Demo", variant: "Shiny", defensiveTypes: ["electric"], offensiveTypes: ["electric"], isDemo: true },
  { id: "demo-007", name: "Penumbra Demo", defensiveTypes: ["ghost", "dark"], offensiveTypes: ["ghost", "psychic"], isDemo: true },
  { id: "demo-008", name: "Rochedo Demo", defensiveTypes: ["rock", "ground"], offensiveTypes: ["rock", "fighting"], isDemo: true },
  { id: "demo-009", name: "Zéfiro Demo", defensiveTypes: ["flying"], offensiveTypes: ["flying", "fairy"], isDemo: true },
  { id: "demo-010", name: "Zéfiro Demo", variant: "Shiny", defensiveTypes: ["flying", "fairy"], offensiveTypes: ["flying"], isDemo: true },
  { id: "demo-011", name: "Cristalino Demo", defensiveTypes: ["ice"], offensiveTypes: ["ice", "psychic"], isDemo: true },
  { id: "demo-012", name: "Ferrugem Demo", defensiveTypes: ["steel"], offensiveTypes: ["steel", "normal"], isDemo: true },
];
