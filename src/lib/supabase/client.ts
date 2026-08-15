"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isDemoMode } from "./config";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;

/**
 * Singleton browser client — used for auth and realtime message streams.
 * Null in demo mode.
 */
export function getBrowserSupabase(): BrowserClient | null {
  if (isDemoMode) return null;
  cached ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
