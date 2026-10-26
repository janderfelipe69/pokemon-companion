import { redirect } from "next/navigation";
import { ClonesView } from "@/components/guild/clones/ClonesView";
import { getCurrentMember } from "@/lib/guild/currentMember";

export const dynamic = "force-dynamic";

export default async function ClonesPage() {
  if (!(await getCurrentMember())) redirect("/guilda");
  return <ClonesView />;
}
