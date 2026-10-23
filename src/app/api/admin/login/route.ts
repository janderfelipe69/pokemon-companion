import { NextResponse } from "next/server";
import { createAdminSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const configuredPassword = process.env.ADMIN_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.json(
      { error: "Autenticação administrativa não configurada." },
      { status: 500 }
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2_000) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 413 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("password" in body) ||
    typeof body.password !== "string" ||
    body.password.length > 1_000
  ) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  if (body.password !== configuredPassword) {
    return NextResponse.json(
      { error: "Senha incorreta." },
      { status: 401 }
    );
  }

  try {
    await createAdminSession();

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível iniciar a sessão." },
      { status: 500 }
    );
  }
}
