/** Remove acentos e ignora maiúsculas, para que "faiscao" encontre "Faiscão". */
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
