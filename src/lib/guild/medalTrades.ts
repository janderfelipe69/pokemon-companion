/** Lógica pura da troca de medalhas (roda no servidor e no navegador). */

export type ListingKind = "have" | "want";
export type MedalListing = { memberId: number; medalId: number; kind: ListingKind; qty: number };

export const MAX_MEDAL_QTY = 99;

/** Uma medalha que pode mudar de mãos, com a quantidade que as duas pontas permitem (o menor dos dois lados). */
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

function index(listings: readonly MedalListing[], kind: ListingKind) {
  const byMember = new Map<number, Map<number, number>>();
  for (const l of listings) {
    if (l.kind !== kind) continue;
    const medals = byMember.get(l.memberId) ?? new Map<number, number>();
    medals.set(l.medalId, l.qty);
    byMember.set(l.memberId, medals);
  }
  return byMember;
}

/** Cruza `have` de quem dá com `want` de quem recebe. */
function lines(have: Map<number, number> | undefined, want: Map<number, number> | undefined): MatchLine[] {
  if (!have || !want) return [];
  const out: MatchLine[] = [];
  for (const [medalId, haveQty] of have) {
    const wantQty = want.get(medalId);
    if (wantQty) out.push({ medalId, qty: Math.min(haveQty, wantQty) });
  }
  return out.sort((a, b) => a.medalId - b.medalId);
}

/** Todos os matches de um membro, com as trocas completas primeiro. */
export function computeMatches(listings: readonly MedalListing[], meId: number): Match[] {
  const have = index(listings, "have");
  const want = index(listings, "want");
  const others = new Set<number>([...have.keys(), ...want.keys()]);
  others.delete(meId);

  const matches: Match[] = [];
  for (const otherId of others) {
    const give = lines(have.get(meId), want.get(otherId));
    const get = lines(have.get(otherId), want.get(meId));
    if (give.length === 0 && get.length === 0) continue;
    matches.push({ otherId, give, get, full: give.length > 0 && get.length > 0 });
  }
  const size = (m: Match) => m.give.length + m.get.length;
  return matches.sort((a, b) => Number(b.full) - Number(a.full) || size(b) - size(a) || a.otherId - b.otherId);
}

export type NotificationKey = { memberId: number; otherId: number; medalId: number; direction: "give" | "get" };
export const notificationId = (n: NotificationKey) => `${n.memberId}:${n.otherId}:${n.medalId}:${n.direction}`;

/** Todos os avisos que deveriam existir agora: um para cada ponta de cada medalha que bate entre duas pessoas. */
export function expectedNotifications(listings: readonly MedalListing[]): NotificationKey[] {
  const have = index(listings, "have");
  const want = index(listings, "want");
  const out: NotificationKey[] = [];
  for (const [giver, haveMedals] of have) {
    for (const [receiver, wantMedals] of want) {
      if (giver === receiver) continue;
      for (const medalId of haveMedals.keys()) {
        if (!wantMedals.has(medalId)) continue;
        out.push({ memberId: giver, otherId: receiver, medalId, direction: "give" });
        out.push({ memberId: receiver, otherId: giver, medalId, direction: "get" });
      }
    }
  }
  return out;
}
