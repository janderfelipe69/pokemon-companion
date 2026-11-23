/** Lógica pura da troca de medalhas (roda no servidor e no navegador). */

export const MAX_MEDAL_QTY = 99;
export const MAX_WANTS = 60;

/** Uma medalha que o membro oferece e, dentro dela, o que ele aceitaria receber em troca (vazio = qualquer proposta). */
export type MedalOffer = { memberId: number; medalId: number; qty: number; wants: number[] };

/** Uma troca possível para uma oferta minha: a oferta de outra pessoa que combina. */
export type TradeCandidate = {
  otherId: number;
  theirMedalId: number;
  theirQty: number;
  /** Quanto dá para trocar (o menor entre as duas quantidades). */
  qty: number;
  /** Eu aceito a medalha dela (está na minha lista de "aceito em troca"). */
  iAccept: boolean;
  /** Ela aceita a minha medalha. */
  theyAccept: boolean;
  /** Os dois lados aceitam. */
  full: boolean;
};

/** Ofertas de outras pessoas que combinam com uma oferta minha, com as trocas completas primeiro. */
export function candidatesFor(offers: readonly MedalOffer[], mine: MedalOffer): TradeCandidate[] {
  const out: TradeCandidate[] = [];
  for (const o of offers) {
    if (o.memberId === mine.memberId || o.medalId === mine.medalId) continue;
    const iAccept = mine.wants.includes(o.medalId);
    const theyAccept = o.wants.includes(mine.medalId);
    if (!iAccept && !theyAccept) continue;
    out.push({ otherId: o.memberId, theirMedalId: o.medalId, theirQty: o.qty, qty: Math.min(mine.qty, o.qty), iAccept, theyAccept, full: iAccept && theyAccept });
  }
  return out.sort((a, b) => Number(b.full) - Number(a.full) || Number(b.theyAccept) - Number(a.theyAccept) || a.otherId - b.otherId || a.theirMedalId - b.theirMedalId);
}

export type NotificationKey = { memberId: number; otherId: number; myMedalId: number; theirMedalId: number };
export const notificationId = (n: NotificationKey) => `${n.memberId}:${n.otherId}:${n.myMedalId}:${n.theirMedalId}`;

/** Todos os avisos que deveriam existir agora: um para cada ponta de cada par de ofertas em que pelo menos um lado aceita o outro. */
export function expectedNotifications(offers: readonly MedalOffer[]): NotificationKey[] {
  const out: NotificationKey[] = [];
  for (const a of offers) {
    for (const b of offers) {
      if (a.memberId === b.memberId || a.medalId === b.medalId) continue;
      if (a.wants.includes(b.medalId) || b.wants.includes(a.medalId)) out.push({ memberId: a.memberId, otherId: b.memberId, myMedalId: a.medalId, theirMedalId: b.medalId });
    }
  }
  return out;
}
