/**
 * Megas não são caça: são DZ, dropados das caças "Sealed". Por isso ficam fora da lista de alvos do montador
 * e aparecem numa aba própria. Para mudar o que vale como caça ou o nome do Sealed de cada Mega, edite só este arquivo.
 */

/** Megas que SÃO caça de verdade e continuam como alvo (espécie em minúsculas, sem o "Mega"). */
export const HUNTABLE_MEGAS: string[] = ["clefable"];

/**
 * Nome da caça Sealed que dropa cada Mega (espécie em minúsculas → nome da caça).
 * Megas que não estão aqui aparecem só como "Drop das caças Sealed". Complete a lista com os nomes que faltam.
 */
export const SEALED_HUNTS: Record<string, string> = {
  scolipede: "Sealed Scolipite",
  mawile: "Sealed Mawilite",
};
