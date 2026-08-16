/**
 * Whether a real Supabase project is configured.
 *
 * The values are trimmed because these are pasted by hand into a hosting
 * dashboard, and a trailing space or newline is easy to include and impossible
 * to see. Untrimmed, a stray character either leaves the app silently in demo
 * mode or produces a URL that fails every request.
 *
 * Both are read as static `process.env.NEXT_PUBLIC_*` expressions on purpose:
 * Next.js only inlines those into the browser bundle when they are written
 * literally, so reading them through a variable key would break the client.
 */

const clean = (value: string | undefined): string => (value ?? "").trim();

/** A trailing slash here doubles up in every request path. */
export const SUPABASE_URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL).replace(
  /\/+$/,
  "",
);

export const SUPABASE_ANON_KEY = clean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * With no Supabase credentials the app serves the seeded demo dataset and
 * writes are simulated in memory. Every data-layer entry point checks this
 * flag first, so a fresh clone is browsable end-to-end with zero setup.
 */
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY;
