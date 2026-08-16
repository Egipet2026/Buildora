import type { AuthChannel } from "./identity";

/**
 * Credential and verification records for demo mode.
 *
 * With Supabase configured these have no equivalent in the application — the
 * auth provider owns all of it.
 */

export interface DemoAccount {
  id: string;
  /** Canonical email, when the member signed up with one. */
  email: string | null;
  /** Canonical E.164 phone, when the member signed up with one. */
  phone: string | null;
  passwordHash: string;
  fullName: string;
  /** False until the six-digit code has been entered correctly. */
  verified: boolean;
  createdAt: string;
}

export type ChallengePurpose = "signup" | "signin";

export interface OtpChallenge {
  id: string;
  accountId: string;
  channel: AuthChannel;
  /** The address or number the code was sent to. */
  destination: string;
  purpose: ChallengePurpose;
  codeHash: string;
  salt: string;
  expiresAt: string;
  /** Wrong guesses so far. The challenge dies after MAX_ATTEMPTS. */
  attempts: number;
  lastSentAt: string;
  consumedAt: string | null;
  /**
   * Demo mode has no mail or SMS provider, so the code is surfaced in the UI
   * instead of being delivered. Never populated when Supabase is configured.
   */
  demoCode: string;
}

export interface DemoSession {
  token: string;
  accountId: string;
  createdAt: string;
}

export const CODE_TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 60 * 1000;
