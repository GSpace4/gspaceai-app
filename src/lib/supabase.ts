// ============================================================
// GSpaceAi — Supabase Server Client
//
// Server-side only. Uses the service role key which has full
// database access. Never import this from client components.
// ============================================================

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns a Supabase admin client, or null if Supabase is not configured.
 * All callers must handle the null case gracefully so the app works
 * without Supabase configured (e.g. in local dev without credentials).
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Supabase not configured — app continues without persistence
    return null;
  }

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}
