import type { DropStone } from "@/config/guildBoost";

/** O mínimo que precisamos saber de um drop publicado para notar que alguém entrou, mudou ou saiu. */
export type PostLite = { name: string; postedAt: string; stones: readonly DropStone[] };

export type ActivityEvent = {
  id: string;
  kind: "joined" | "updated" | "left";
  name: string;
  /** Quantas stones o drop publicado tem (0 quando a pessoa saiu). */
  stones: number;
  at: number;
};

const countStones = (post: PostLite) => post.stones.reduce((n, s) => n + s.qty, 0);

/**
 * Compara duas listas de drops publicados e conta o que aconteceu entre elas:
 * quem publicou, quem publicou de novo (o horário muda) e quem retirou. Na primeira carga (`prev` nulo) não há novidade.
 */
export function diffPosts(prev: readonly PostLite[] | null, next: readonly PostLite[], now: number = Date.now()): ActivityEvent[] {
  if (!prev) return [];
  const before = new Map(prev.map((p) => [p.name, p]));
  const after = new Map(next.map((p) => [p.name, p]));
  const events: ActivityEvent[] = [];
  for (const post of next) {
    const old = before.get(post.name);
    if (!old) events.push({ id: `${post.name}:${post.postedAt}:joined`, kind: "joined", name: post.name, stones: countStones(post), at: now });
    else if (old.postedAt !== post.postedAt) events.push({ id: `${post.name}:${post.postedAt}:updated`, kind: "updated", name: post.name, stones: countStones(post), at: now });
  }
  for (const post of prev) if (!after.has(post.name)) events.push({ id: `${post.name}:${now}:left`, kind: "left", name: post.name, stones: 0, at: now });
  return events;
}

/** "agora", "há 12 s", "há 3 min". */
export function ago(at: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 5) return "agora";
  if (seconds < 60) return `há ${seconds} s`;
  return `há ${Math.floor(seconds / 60)} min`;
}
