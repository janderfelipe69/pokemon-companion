import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const authenticated = await isAdminAuthenticated();

    return NextResponse.json(
      { authenticated },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível verificar a sessão." },
      { status: 500 }
    );
  }
}
