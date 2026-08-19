import "server-only";

import { emailProvider, smsProvider } from "./auth/delivery";
import { SUPABASE_URL, isDemoMode } from "./supabase/config";

/**
 * What this deployment is actually connected to.
 *
 * Diagnosing "why is the AI not writing my plan?" meant guessing at a hosting
 * dashboard from the outside. This reports the answer from inside the running
 * server, which is the only place that knows.
 *
 * It reports presence and shape, never a value. A key that is set is reported
 * as set; nothing here ever returns the key itself, a prefix of it, or an
 * error message from a provider, because this renders in a page.
 */

export type IntegrationStatus = {
  name: string;
  /** What it powers, in the reader's terms rather than the variable's. */
  purpose: string;
  connected: boolean;
  /** Which provider answered, when more than one can. */
  detail: string;
  /** What to set when it is not connected. */
  variable?: string;
  /** Set when the value is present but visibly wrong, which is worth saying. */
  warning?: string;
};

const value = (name: string): string => (process.env[name] ?? "").trim();

export function integrationStatuses(): IntegrationStatus[] {
  const anthropic = value("ANTHROPIC_API_KEY");
  const model = value("ANTHROPIC_MODEL") || "claude-opus-5";

  return [
    {
      name: "Database",
      purpose: "Accounts, listings, messages — everything that must survive a restart",
      connected: !isDemoMode,
      detail: isDemoMode
        ? "Running on sample data held in memory"
        : new URL(SUPABASE_URL).hostname,
      variable: "NEXT_PUBLIC_SUPABASE_URL",
    },
    {
      name: "AI",
      purpose: "Business plans, market research and the listing assistant",
      connected: anthropic.length > 0,
      detail: anthropic ? `Connected · ${model}` : "Falling back to built-in templates",
      variable: "ANTHROPIC_API_KEY",
      // Worth catching here: a key pasted with the surrounding quotes, or the
      // key name pasted into the value box, both look "set" and both fail.
      warning:
        anthropic && !anthropic.startsWith("sk-ant-")
          ? "The value is set but does not look like an Anthropic key — they begin with sk-ant-."
          : undefined,
    },
    {
      name: "Email",
      purpose: "Sign-in codes sent to an email address",
      connected: emailProvider() !== null,
      detail:
        emailProvider() === "resend"
          ? "Resend"
          : emailProvider() === "smtp"
            ? "SMTP"
            : "Codes are shown on screen instead of being sent",
      variable: "RESEND_API_KEY or SMTP_HOST",
    },
    {
      name: "SMS",
      purpose: "Sign-in codes sent to a phone number",
      connected: smsProvider() !== null,
      detail: smsProvider() ? "Twilio" : "Codes are shown on screen instead of being sent",
      variable: "TWILIO_ACCOUNT_SID",
    },
  ];
}
