import type { AuthChannel } from "./identity";
import type { ChallengePurpose } from "./types";

/**
 * Shared result shape for the auth actions, plus its initial value.
 *
 * Kept out of `actions.ts` because a `"use server"` module may only export
 * async functions — a constant or an interface there fails the build.
 */
export interface AuthState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Drives which step the form shows. */
  step?: "credentials" | "verify";
  channel?: AuthChannel;
  /** Partially hidden, for display only. */
  maskedDestination?: string;
  /** Round-tripped through a hidden field so the verify step knows the target. */
  destination?: string;
  purpose?: ChallengePurpose;
  /** Demo mode only: there is no mail or SMS provider, so the code is shown. */
  demoCode?: string;
  /** Whether a provider actually accepted the message, so the screen can say
      what happened rather than assuming it worked. */
  delivered?: boolean;
  redirectTo?: string;
  /** Unix ms after which a new code may be requested. */
  resendAvailableAt?: number;
}

export const AUTH_IDLE: AuthState = { ok: false, step: "credentials" };
