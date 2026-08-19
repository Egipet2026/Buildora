/**
 * The Supabase project this repository is deployed against.
 *
 * These two values are public by design. The publishable key is shipped to
 * every visitor's browser on every page load — it is not a credential, and
 * Supabase's own dashboard says it can be shared publicly. What actually
 * protects the data is row-level security, which is enabled on every table by
 * the migrations in supabase/migrations/.
 *
 * They live in the repository rather than in the host's environment settings
 * so that deploying needs no configuration at all. Environment variables still
 * win where they are set (see config.ts), so a fork or a second environment
 * can point somewhere else without touching this file.
 *
 * The secret key — `sb_secret_…` — must never appear here or anywhere else in
 * this repository. It bypasses row-level security entirely.
 */

export const PROJECT_URL = "https://welpjznzzsjuzwpgfnao.supabase.co";

export const PROJECT_PUBLISHABLE_KEY =
  "sb_publishable_sBBzaolfT5Qa11UMpTgGkg_qx-LV8SB";
