import { PROJECT_PUBLISHABLE_KEY, PROJECT_URL } from "./project";

/**
 * Which Supabase project to talk to, and whether one is configured at all.
 *
 * The environment is consulted first so a fork, a staging deployment or a
 * local checkout can point elsewhere by setting two variables. Failing that,
 * the project committed in `project.ts` is used, which is what makes a plain
 * `git push` deploy a working site with no dashboard configuration.
 *
 * Values are trimmed because they are pasted by hand into hosting dashboards,
 * where a trailing space or newline is easy to include and impossible to see.
 *
 * Both are read as literal `process.env.NEXT_PUBLIC_*` expressions on purpose:
 * Next.js only inlines those into the browser bundle when they are written
 * that way, so reading them through a variable key would break the client.
 */

const clean = (value: string | undefined): string => (value ?? "").trim();

/** A trailing slash here doubles up in every request path. */
const stripSlash = (url: string): string => url.replace(/\/+$/, "");

export const SUPABASE_URL =
  stripSlash(clean(process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  stripSlash(PROJECT_URL);

export const SUPABASE_ANON_KEY =
  clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || PROJECT_PUBLISHABLE_KEY;

/**
 * With no Supabase project at all the app serves the seeded demo dataset and
 * writes are simulated in memory. Every data-layer entry point checks this
 * flag first.
 */
export const isDemoMode = !SUPABASE_URL || !SUPABASE_ANON_KEY;
