import "server-only";

import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

/**
 * Password hashing and confirmation-code handling for demo mode.
 *
 * When Supabase is configured it owns credentials entirely and none of this
 * runs — Supabase Auth hashes passwords and issues its own one-time codes.
 * This exists so the demo deployment behaves like the real thing rather than
 * comparing plaintext.
 */

const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  // Lengths must match before timingSafeEqual, which throws otherwise.
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

/**
 * A six-digit confirmation code.
 *
 * Uses the CSPRNG rather than Math.random: a predictable code would let anyone
 * confirm someone else's sign-up. The full range is used, so codes may have
 * leading zeros — they are kept as a padded string throughout.
 */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export async function hashCode(code: string, salt: string): Promise<string> {
  const derived = (await scrypt(code, salt, 32)) as Buffer;
  return derived.toString("hex");
}

export function newSalt(): string {
  return randomBytes(16).toString("hex");
}

export async function verifyCode(
  code: string,
  salt: string,
  storedHash: string,
): Promise<boolean> {
  const derived = Buffer.from(await hashCode(code, salt), "hex");
  const expected = Buffer.from(storedHash, "hex");
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(derived, expected);
}

export function newToken(): string {
  return randomBytes(32).toString("hex");
}
