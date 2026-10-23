"use client";

import { useState } from "react";

/** Encerra a sessão de administrador e volta para a tela de login (sem mostrar JSON). */
export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      window.location.href = "/admin";
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="rounded-lg border border-white/15 px-4 py-2 transition hover:bg-white/10 disabled:opacity-50"
    >
      {loading ? "Saindo…" : "Sair do painel"}
    </button>
  );
}
