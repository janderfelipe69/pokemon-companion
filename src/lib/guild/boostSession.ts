import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { createMemberToken, readMemberToken } from "./boostToken";

const COOKIE_NAME = "pokemon_guild_member";
const SESSION_SECONDS = 60 * 60 * 24 * 30; // 30 dias

// Usa o mesmo segredo do admin, mas o cookie e a assinatura são diferentes: entrar como membro NÃO dá acesso ao admin.
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET não configurado corretamente.");
  return secret;
}

/** Senha única dos membros. É "1" de propósito (pouca segurança); dá para trocar com GUILD_MEMBER_PASSWORD na Vercel. */
function memberPassword(): string {
  return process.env.GUILD_MEMBER_PASSWORD?.trim() || "1";
}

export function isMemberPasswordCorrect(input: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(memberPassword()).digest();
  return timingSafeEqual(a, b);
}

const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" });

export async function createMemberSession(memberId: number): Promise<void> {
  const token = createMemberToken(memberId, Math.floor(Date.now() / 1000) + SESSION_SECONDS, getSecret());
  (await cookies()).set(COOKIE_NAME, token, { ...cookieOptions(), maxAge: SESSION_SECONDS });
}

/** Id do membro logado, ou `null`. */
export async function getMemberSessionId(): Promise<number | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return readMemberToken(token, getSecret());
  } catch {
    return null;
  }
}

export async function destroyMemberSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", { ...cookieOptions(), maxAge: 0 });
}
