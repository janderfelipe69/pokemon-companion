/** Lógica pura da troca de medalhas (roda no servidor e no navegador). */

export const MAX_MEDAL_QTY = 99;

/** Uma medalha que o membro tem para trocar, com a quantidade. */
export type MedalOffer = { memberId: number; medalId: number; qty: number };
/** Uma medalha que o membro quer receber (a lista de "quero" vale para todas as medalhas que ele tem). */
export type MedalWant = { memberId: number; medalId: number };

/** Uma medalha que pode mudar de mãos e quanto dela o dono tem para entregar. */
export type MatchLine = { medalId: number; qty: number };

export type Match = {
  otherId: number;
  /** Medalhas que eu tenho e o outro quer. */
  give: MatchLine[];
  /** Medalhas que o outro tem e eu quero. */
  get: MatchLine[];
  /** Troca completa: eu dou algo que ele quer e ele dá algo que eu quero. */
  full: boolean;
};

function wantsByMember(wants: readonly MedalWant[]) {
  const map = new Map<number, Set<number>>();
  for (const w of wants) {
    const set = map.get(w.memberId) ?? new Set<number>();
    set.add(w.medalId);
    map.set(w.memberId, set);
  }
  return map;
}

function offersByMember(offers: readonly MedalOffer[]) {
  const map = new Map<number, MedalOffer[]>();
  for (const o of offers) map.set(o.memberId, [...(map.get(o.memberId) ?? []), o]);
  return map;
}

const toLines = (offers: readonly MedalOffer[] | undefined, wanted: ReadonlySet<number> | undefined): MatchLine[] =>
  (offers ?? []).filter((o) => wanted?.has(o.medalId)).map((o) => ({ medalId: o.medalId, qty: o.qty })).sort((a, b) => a.medalId - b.medalId);

/** Todas as trocas possíveis de um membro, com as completas primeiro. */
export function computeMatches(offers: readonly MedalOffer[], wants: readonly MedalWant[], meId: number): Match[] {
  const have = offersByMember(offers);
  const want = wantsByMember(wants);
  const others = new Set<number>([...have.keys(), ...want.keys()]);
  others.delete(meId);

  const matches: Match[] = [];
  for (const otherId of others) {
    const give = toLines(have.get(meId), want.get(otherId));
    const get = toLines(have.get(otherId), want.get(meId));
    if (give.length === 0 && get.length === 0) continue;
    matches.push({ otherId, give, get, full: give.length > 0 && get.length > 0 });
  }
  const size = (m: Match) => m.give.length + m.get.length;
  return matches.sort((a, b) => Number(b.full) - Number(a.full) || size(b) - size(a) || a.otherId - b.otherId);
}

export type NotificationKey = { memberId: number; otherId: number; medalId: number; direction: "give" | "get" };
export const notificationId = (n: NotificationKey) => `${n.memberId}:${n.otherId}:${n.medalId}:${n.direction}`;

/** Todos os avisos que deveriam existir agora: um para cada ponta de cada medalha que bate entre duas pessoas. */
export function expectedNotifications(offers: readonly MedalOffer[], wants: readonly MedalWant[]): NotificationKey[] {
  const want = wantsByMember(wants);
  const out: NotificationKey[] = [];
  for (const o of offers) {
    for (const [memberId, medals] of want) {
      if (memberId === o.memberId || !medals.has(o.medalId)) continue;
      out.push({ memberId: o.memberId, otherId: memberId, medalId: o.medalId, direction: "give" });
      out.push({ memberId, otherId: o.memberId, medalId: o.medalId, direction: "get" });
    }
  }
  return out;
}
