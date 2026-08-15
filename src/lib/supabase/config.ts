export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * With no Supabase credentials the app serves the seeded demo dataset and
 * writes are simulated in memory. Every data-layer entry point checks this
 * flag first, so a fresh clone is browsable end-to-end with zero setup.
 */
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY;
