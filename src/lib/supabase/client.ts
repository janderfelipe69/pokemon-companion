import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

/**
 * Cliente de leitura pública (papel `anon`, sujeito ao RLS), sem sessão de usuário.
 * Usa apenas a chave pública. Nunca use a chave `service_role` aqui nem em qualquer código do site.
 * Devolve `null` se o Supabase não estiver configurado.
 */
export function createPublicClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config) return null;
  return createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
