import { createHmac, timingSafeEqual } from "node:crypto";

// Sem dependências do Next, para poder ser testado sozinho. Quem usa os cookies é o boostSession.ts.

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(`guild-member:${payload}`).digest("hex");

/** Token assinado no formato `idDoMembro.validade.assinatura`. */
export function createMemberToken(memberId: number, expiresAt: number, secret: string): string {
  const payload = `${memberId}.${expiresAt}`;
  return `${payload}.${sign(secret, payload)}`;
}

/** Devolve o id do membro se o token é legítimo e não venceu; senão `null`. */
export function readMemberToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): number | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [id, expiresAt, signature] = parts;
  if (!/^\d{1,15}$/.test(id) || !/^\d{1,15}$/.test(expiresAt) || !/^[a-f0-9]{64}$/.test(signature)) return null;
  if (Number(expiresAt) <= nowSeconds) return null;

  const expected = Buffer.from(sign(secret, `${id}.${expiresAt}`), "hex");
  const received = Buffer.from(signature, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  return Number(id);
}
