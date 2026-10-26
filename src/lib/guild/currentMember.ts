import "server-only";
import { listMembers, type GuildMember } from "./boostData";
import { getMemberSessionId } from "./boostSession";

/** O membro logado (cookie assinado + ainda existe na guilda), ou `null`. */
export async function getCurrentMember(): Promise<GuildMember | null> {
  const id = await getMemberSessionId();
  if (!id) return null;
  try {
    return (await listMembers()).find((m) => m.id === id) ?? null;
  } catch {
    return null;
  }
}
