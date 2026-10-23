import { NextResponse } from "next/server";
import { destroyAdminSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST() {
  try {
    await destroyAdminSession();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível encerrar a sessão." },
      { status: 500 }
    );
  }
}
