/**
 * Fonte padrão de imagens: repositório público PokeAPI/sprites (arquivos do GitHub).
 * Para trocar de fonte (CDN própria, arquivos locais), altere só esta constante.
 * As imagens pertencem à Nintendo/Game Freak/Creatures; veja o aviso na página da Pokédex.
 */
export const SPRITES_BASE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const spriteUrl = (relativePath: string) => `${SPRITES_BASE_URL}/${relativePath}`;
