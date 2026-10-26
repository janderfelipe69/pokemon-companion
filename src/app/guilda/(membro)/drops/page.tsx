import { redirect } from "next/navigation";
import { DropsView } from "@/components/guild/DropsView";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const dynamic = "force-dynamic";

export default async function DropsPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/guilda");
  return <DropsView me={member.name} />;
}
