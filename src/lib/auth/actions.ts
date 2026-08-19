"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "../supabase/config";
import { getServerSupabase } from "../supabase/server";
import { demoId, demoStore } from "../demo/store";
import { fieldErrors } from "../validation";
import type { Profile } from "../types";
import {
  generateCode,
  hashCode,
  hashPassword,
  newSalt,
  verifyCode,
  verifyPassword,
} from "./crypto";
import {
  channelNoun,
  detectChannel,
  isValidEmail,
  isValidPhone,
  maskDestination,
  normaliseEmail,
  normalisePhone,
  type AuthChannel,
} from "./identity";
import { canDeliver, deliverCode } from "./delivery";
import { endDemoSession, startDemoSession } from "./session";
import type { AuthState } from "./state";
import {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  type ChallengePurpose,
  type DemoAccount,
  type OtpChallenge,
} from "./types";

/**
 * Sign-up and sign-in with an email address or a phone number, confirmed by a
 * six-digit code.
 *
 * Both paths drive the same three-step interface. With Supabase configured the
 * provider issues and checks the code (email OTP, or SMS through the project's
 * messaging provider). Without it, the flow runs against the in-memory store
 * and the code is shown on screen because there is nothing to deliver it.
 */


function fail(message: string, errors?: Record<string, string>): AuthState {
  return { ok: false, step: "credentials", message, errors };
}

/* ------------------------------------------------------------ validation */

const credentialsSchema = z.object({
  // One field. What it holds is worked out here, not chosen by the member.
  identifier: z.string().trim().min(1, "Enter your email or phone number"),
  dialCode: z.string().default("+359"),
  password: z.string().min(8, "Use at least 8 characters"),
  fullName: z.string().default(""),
});

/** Resolves the submitted method into a canonical destination. */
/**
 * Turns whatever the member typed into a channel and a canonical destination.
 *
 * Detection runs on the server as well as in the browser: the client only
 * changes what the form looks like, and a form field is not something to
 * trust when it decides where a login code gets sent.
 */
function resolveDestination(
  v: z.infer<typeof credentialsSchema>,
): { channel: AuthChannel; destination: string } | { error: AuthState } {
  const channel = detectChannel(v.identifier);

  if (channel === null) {
    return {
      error: fail("Check the details below.", {
        identifier: "Enter an email address or a phone number",
      }),
    };
  }

  if (channel === "email") {
    const email = normaliseEmail(v.identifier);
    if (!isValidEmail(email)) {
      return {
        error: fail("Check the details below.", {
          identifier: "That email address does not look right",
        }),
      };
    }
    return { channel: "email", destination: email };
  }

  // A number typed with its own country code keeps it; one typed without
  // takes the code chosen beside the field.
  const typed = v.identifier.trim();
  const e164 = typed.startsWith("+")
    ? `+${typed.replace(/\D/g, "")}`
    : normalisePhone(v.dialCode, typed);

  if (!isValidPhone(e164)) {
    return {
      error: fail("Check the details below.", {
        identifier: "Enter a valid number, without the leading zero",
      }),
    };
  }
  return { channel: "phone", destination: e164 };
}

/* -------------------------------------------------------- demo challenges */

async function issueDemoChallenge(
  accountId: string,
  channel: AuthChannel,
  destination: string,
  purpose: ChallengePurpose,
): Promise<OtpChallenge> {
  const store = demoStore();

  // Only one live challenge per destination — issuing a new code retires the
  // previous one, so an old code can never be replayed.
  for (const c of store.challenges) {
    if (c.destination === destination && !c.consumedAt) {
      c.consumedAt = new Date().toISOString();
    }
  }

  const code = generateCode();
  const salt = newSalt();
  const challenge: OtpChallenge = {
    id: demoId("otp"),
    accountId,
    channel,
    destination,
    purpose,
    codeHash: await hashCode(code, salt),
    salt,
    expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0,
    lastSentAt: new Date().toISOString(),
    consumedAt: null,
    demoCode: code,
    delivered: false,
    deliveryError: null,
  };
  store.challenges.push(challenge);

  // Send it for real when a provider is configured. `delivered` decides
  // whether the UI may fall back to showing the code on screen.
  const result = await deliverCode(channel, destination, code);
  challenge.delivered = result.delivered;
  challenge.deliveryError = result.error ?? null;
  if (result.error) {
    console.error(
      `[auth] code delivery to ${channel} failed via ${result.provider ?? "no provider"}: ${result.error}`,
    );
  }

  return challenge;
}

/**
 * What the member is told, and whether they get to see the code.
 *
 * The code is only ever put on screen when there is genuinely no provider to
 * send it with — never as a convenience once one is configured.
 */
/**
 * Whether the code may be put on screen at all.
 *
 * The only acceptable reason is that nothing exists to deliver it with. A
 * provider that is configured but failed is emphatically not a licence to
 * print the code: the failure is temporary and retryable, whereas a code on
 * screen can be read by anyone looking at it — including over a shoulder, in
 * a screen recording, or by whoever the browser is shared with.
 *
 * Every branch that might reveal the code goes through this one function, so
 * the rule cannot drift apart between the first attempt, a wrong guess and a
 * resend.
 */
function codeMayBeShown(channel: AuthChannel): boolean {
  return !canDeliver(channel);
}

function deliveryState(
  channel: AuthChannel,
  challenge: OtpChallenge,
): { message: string; demoCode?: string; delivered: boolean } {
  if (challenge.delivered) {
    return {
      delivered: true,
      message: `We sent a 6-digit code to your ${channelNoun(channel)}.`,
    };
  }

  if (!codeMayBeShown(channel)) {
    // A provider exists but refused. The member gets a retry, not the code.
    return {
      delivered: false,
      message: `We could not send the code to your ${channelNoun(channel)} just now. Request a new one in a moment.`,
    };
  }

  return {
    delivered: false,
    message: `No ${channel === "email" ? "email" : "SMS"} provider is configured, so the code is shown below instead of being sent.`,
    demoCode: challenge.demoCode,
  };
}

function findDemoAccount(destination: string): DemoAccount | undefined {
  return demoStore().accounts.find(
    (a) => a.email === destination || a.phone === destination,
  );
}

/** The profile row that the rest of the marketplace reads. */
function createDemoProfile(account: DemoAccount): Profile {
  const profile: Profile = {
    id: account.id,
    full_name: account.fullName || "New member",
    avatar_url: null,
    headline: null,
    bio: null,
    country: null,
    role: "user",
    is_verified: false,
    verification_status: "none",
    is_blocked: false,
    premium_tier: "free",
    created_at: account.createdAt,
  };
  demoStore().profiles.push(profile);
  return profile;
}

/* ------------------------------------------------------------- register */

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail("Check the details below.", fieldErrors(parsed.error));
  }
  const v = parsed.data;

  if (v.fullName.trim().length < 2) {
    return fail("Check the details below.", { fullName: "Enter your name" });
  }

  const resolved = resolveDestination(v);
  if ("error" in resolved) return resolved.error;
  const { channel, destination } = resolved;

  const pending: AuthState = {
    ok: true,
    step: "verify",
    channel,
    destination,
    maskedDestination: maskDestination(channel, destination),
    purpose: "signup",
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
    message: `We sent a 6-digit code to your ${channelNoun(channel)}.`,
  };

  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    const { error } = await supabase!.auth.signUp(
      channel === "email"
        ? {
            email: destination,
            password: v.password,
            options: { data: { full_name: v.fullName.trim() } },
          }
        : {
            phone: destination,
            password: v.password,
            options: { data: { full_name: v.fullName.trim() } },
          },
    );
    if (error) return fail(error.message);
    return { ...pending, delivered: true };
  }

  const store = demoStore();
  const existing = findDemoAccount(destination);
  if (existing?.verified) {
    return fail(
      `An account already uses that ${channelNoun(channel)}. Sign in instead.`,
    );
  }

  // An unverified account can be re-registered — someone who abandoned the
  // code step should not be locked out of their own address.
  const account: DemoAccount = existing ?? {
    id: demoId("u"),
    email: channel === "email" ? destination : null,
    phone: channel === "phone" ? destination : null,
    passwordHash: "",
    fullName: v.fullName.trim(),
    verified: false,
    createdAt: new Date().toISOString(),
  };
  account.passwordHash = await hashPassword(v.password);
  account.fullName = v.fullName.trim();
  if (!existing) store.accounts.push(account);

  const challenge = await issueDemoChallenge(
    account.id,
    channel,
    destination,
    "signup",
  );

  return { ...pending, ...deliveryState(channel, challenge) };
}

/* ---------------------------------------------------------------- login */

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return fail("Check the details below.", fieldErrors(parsed.error));
  }
  const v = parsed.data;

  const resolved = resolveDestination(v);
  if ("error" in resolved) return resolved.error;
  const { channel, destination } = resolved;

  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    const { error } = await supabase!.auth.signInWithPassword(
      channel === "email"
        ? { email: destination, password: v.password }
        : { phone: destination, password: v.password },
    );

    if (error) {
      // An unconfirmed account needs the code step, not a rejection.
      if (/confirm/i.test(error.message)) {
        return {
          ok: true,
          step: "verify",
          channel,
          destination,
          maskedDestination: maskDestination(channel, destination),
          purpose: "signup",
          resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
          message: `Confirm your ${channelNoun(channel)} to finish signing in.`,
        };
      }
      return fail("Those details do not match an account.");
    }

    revalidatePath("/", "layout");
    return { ok: true, redirectTo: "/dashboard" };
  }

  const account = findDemoAccount(destination);
  // Deliberately identical whether the account is missing or the password is
  // wrong, so the form cannot be used to discover who has an account.
  const invalid = fail("Those details do not match an account.");
  if (!account) return invalid;
  if (!(await verifyPassword(v.password, account.passwordHash))) return invalid;

  if (!account.verified) {
    const challenge = await issueDemoChallenge(
      account.id,
      channel,
      destination,
      "signup",
    );
    return {
      ok: true,
      step: "verify",
      channel,
      destination,
      maskedDestination: maskDestination(channel, destination),
      purpose: "signup",
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
      ...deliveryState(channel, challenge),
    };
  }

  await startDemoSession(account.id);
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/dashboard" };
}

/* ----------------------------------------------------------- code step */

const verifySchema = z.object({
  code: z
    .string()
    .trim()
    .transform((s) => s.replace(/\D/g, ""))
    .refine((s) => s.length === 6, "Enter the 6-digit code"),
  destination: z.string().min(1),
  channel: z.enum(["email", "phone"]),
  purpose: z.enum(["signup", "signin"]).default("signup"),
});

/**
 * The single action behind the code step. Both the confirm button and the
 * resend link post here, distinguished by `intent`, so the step is driven by
 * one piece of state rather than two that overwrite each other's messages.
 */
export async function verifyCodeAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const channel = (formData.get("channel") as AuthChannel) ?? "email";
  const destination = String(formData.get("destination") ?? "");
  const purpose = (formData.get("purpose") as ChallengePurpose) ?? "signup";

  /** Keeps the user on the code step, preserving everything it needs to render. */
  const stay = (message: string, extra?: Partial<AuthState>): AuthState => ({
    ok: false,
    step: "verify",
    channel,
    destination,
    purpose,
    maskedDestination: maskDestination(channel, destination),
    message,
    ...extra,
  });

  if (!destination) return fail("Start again from the beginning.");

  if (String(formData.get("intent") ?? "verify") === "resend") {
    return resendCode(channel, destination, purpose, stay);
  }

  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors = fieldErrors(parsed.error);
    return stay(errors.code ?? "Enter the 6-digit code.", {
      errors,
      demoCode: liveDemoCode(channel, destination),
    });
  }
  const code = parsed.data.code;

  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    const { error } = await supabase!.auth.verifyOtp(
      channel === "email"
        ? { email: destination, token: code, type: "signup" }
        : { phone: destination, token: code, type: "sms" },
    );
    if (error) return stay(error.message);

    revalidatePath("/", "layout");
    return { ok: true, redirectTo: "/dashboard" };
  }

  const store = demoStore();
  const challenge = store.challenges.find(
    (c) => c.destination === destination && !c.consumedAt,
  );
  if (!challenge) return stay("That code is no longer valid. Request a new one.");

  if (Date.now() > new Date(challenge.expiresAt).getTime()) {
    challenge.consumedAt = new Date().toISOString();
    return stay("That code has expired. Request a new one.");
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    challenge.consumedAt = new Date().toISOString();
    return stay("Too many incorrect attempts. Request a new code.");
  }

  if (!(await verifyCode(code, challenge.salt, challenge.codeHash))) {
    challenge.attempts += 1;
    const left = MAX_ATTEMPTS - challenge.attempts;
    if (left <= 0) {
      challenge.consumedAt = new Date().toISOString();
      return stay("Too many incorrect attempts. Request a new code.");
    }
    return stay(
      `That code is not right. ${left} ${left === 1 ? "attempt" : "attempts"} left.`,
      { demoCode: codeMayBeShown(channel) ? challenge.demoCode : undefined },
    );
  }

  challenge.consumedAt = new Date().toISOString();

  const account = store.accounts.find((a) => a.id === challenge.accountId);
  if (!account) return stay("That account no longer exists.");

  if (!account.verified) {
    account.verified = true;
    createDemoProfile(account);
  }

  await startDemoSession(account.id);
  revalidatePath("/", "layout");
  return { ok: true, redirectTo: "/dashboard" };
}

/** The code of the live challenge, so the demo hint survives a failed attempt. */
function liveDemoCode(
  channel: AuthChannel,
  destination: string,
): string | undefined {
  if (!isDemoMode || !codeMayBeShown(channel)) return undefined;
  return demoStore().challenges.find(
    (c) => c.destination === destination && !c.consumedAt,
  )?.demoCode;
}

async function resendCode(
  channel: AuthChannel,
  destination: string,
  purpose: ChallengePurpose,
  stay: (message: string, extra?: Partial<AuthState>) => AuthState,
): Promise<AuthState> {
  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    const { error } = await supabase!.auth.resend(
      channel === "email"
        ? { type: "signup", email: destination }
        : { type: "sms", phone: destination },
    );
    if (error) return stay(error.message);
    return stay("A new code is on its way.", {
      resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
    });
  }

  const store = demoStore();
  const previous = store.challenges
    .filter((c) => c.destination === destination)
    .at(-1);

  if (previous) {
    const since = Date.now() - new Date(previous.lastSentAt).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESEND_COOLDOWN_MS - since) / 1000);
      return stay(`Wait ${wait}s before requesting another code.`, {
        demoCode:
          previous.consumedAt || !codeMayBeShown(channel)
            ? undefined
            : previous.demoCode,
        resendAvailableAt:
          new Date(previous.lastSentAt).getTime() + RESEND_COOLDOWN_MS,
      });
    }
  }

  const account = previous
    ? store.accounts.find((a) => a.id === previous.accountId)
    : demoStore().accounts.find(
        (a) => a.email === destination || a.phone === destination,
      );
  if (!account) return stay("Start again from the beginning.");

  const challenge = await issueDemoChallenge(
    account.id,
    channel,
    destination,
    purpose,
  );
  const state = deliveryState(channel, challenge);
  return stay(challenge.delivered ? "A new code is on its way." : state.message, {
    demoCode: state.demoCode,
    resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
  });
}

/* --------------------------------------------------------------- signout */

export async function signOutAction(): Promise<void> {
  if (isDemoMode) {
    await endDemoSession();
  } else {
    const supabase = await getServerSupabase();
    await supabase?.auth.signOut();
  }
  revalidatePath("/", "layout");
}
