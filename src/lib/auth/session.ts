import "server-only";

import { cookies } from "next/headers";
import { demoStore } from "../demo/store";
import { newToken } from "./crypto";

/**
 * Session handling for demo mode.
 *
 * With Supabase configured, sessions are its own signed cookies and none of
 * this is used. Here a random opaque token maps to an account in the in-memory
 * store, so the cookie cannot be edited into someone else's identity.
 */

export const SESSION_COOKIE = "bizora_session";
/** Written on sign-out so the seeded demo identity does not come straight back. */
export const GUEST_VALUE = "guest";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

export async function startDemoSession(accountId: string): Promise<void> {
  const token = newToken();
  demoStore().sessions.push({
    token,
    accountId,
    createdAt: new Date().toISOString(),
  });
  (await cookies()).set(SESSION_COOKIE, token, COOKIE_OPTIONS);
}

export async function endDemoSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token && token !== GUEST_VALUE) {
    const sessions = demoStore().sessions;
    const index = sessions.findIndex((s) => s.token === token);
    if (index >= 0) sessions.splice(index, 1);
  }
  store.set(SESSION_COOKIE, GUEST_VALUE, COOKIE_OPTIONS);
}

/**
 * Resolves the signed-in account id from the cookie.
 *
 * Three outcomes: an explicit session, an explicit sign-out, or nothing at
 * all — the last leaves the seeded demo account signed in so the marketplace
 * stays browsable on a fresh visit.
 */
export async function readDemoSession(): Promise<
  { kind: "account"; accountId: string } | { kind: "guest" } | { kind: "none" }
> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { kind: "none" };
  if (token === GUEST_VALUE) return { kind: "guest" };

  const session = demoStore().sessions.find((s) => s.token === token);
  // An unknown token means the server restarted and dropped the store.
  return session ? { kind: "account", accountId: session.accountId } : { kind: "none" };
}
