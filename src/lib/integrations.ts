import "server-only";

import { emailProvider, smsProvider } from "./auth/delivery";
import { isTestMode, paymentsEnabled } from "./payments/stripe";
import { hasServiceRole } from "./supabase/service";
import { SUPABASE_URL, isDemoMode } from "./supabase/config";

/**
 * What this deployment is actually connected to.
 *
 * Whether email or SMS actually leaves the building is not something you can
 * tell from the outside, and guessing at a hosting dashboard is how it used to
 * be done. This reports it from inside the running server, which is the only
 * place that knows.
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
      name: "Payments",
      purpose: "Card payments, the commission split and seller payouts",
      connected: paymentsEnabled(),
      detail: paymentsEnabled()
        ? isTestMode()
          ? "Stripe · test mode — no money moves"
          : "Stripe · live"
        : "Sales are recorded without money changing hands",
      variable: "STRIPE_SECRET_KEY",
      // A live Stripe key with no way to write past row-level security means
      // real money is taken and nothing is granted for it. Worth shouting about.
      warning:
        paymentsEnabled() && !hasServiceRole()
          ? "Stripe is connected but SUPABASE_SERVICE_ROLE_KEY is not set, so the webhook cannot record a payment. Payments would be taken and nothing granted — set it before going live."
          : paymentsEnabled() && !(process.env.STRIPE_WEBHOOK_SECRET ?? "").trim()
            ? "STRIPE_WEBHOOK_SECRET is not set, so Stripe's confirmation is refused and nothing paid for is ever granted."
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
