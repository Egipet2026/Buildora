import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * The service-role client, which bypasses row-level security.
 *
 * Used by exactly one caller: the Stripe webhook, which has no signed-in user
 * to act as and must still be able to mark a payment settled, a listing sold
 * and a seller payable.
 *
 * The key is read from the environment and is never committed, unlike the
 * publishable key in `project.ts`. It must not reach the browser, so this
 * module is `server-only` and nothing here is exported to a client component.
 * If it is absent the caller is told so rather than quietly falling back to a
 * client that would silently write nothing.
 */

let client: SupabaseClient | null = null;

export function getServiceSupabase(): SupabaseClient | null {
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();
  if (!key || !SUPABASE_URL) return null;

  client ??= createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/** Whether the webhook can write at all. Reported in the admin panel. */
export function hasServiceRole(): boolean {
  return (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim().length > 0;
}
