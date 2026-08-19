/**
 * Identity handling for sign-up and sign-in.
 *
 * A member identifies with either an email address or a phone number. Both are
 * normalised to a canonical form before anything is stored or compared, so the
 * same person cannot end up with two accounts through casing or formatting.
 */

export type AuthChannel = "email" | "phone";

/** Dial codes for the countries the marketplace serves. */
export const DIAL_CODES: { country: string; code: string; flag: string }[] = [
  { country: "Bulgaria", code: "+359", flag: "🇧🇬" },
  { country: "Germany", code: "+49", flag: "🇩🇪" },
  { country: "Spain", code: "+34", flag: "🇪🇸" },
  { country: "France", code: "+33", flag: "🇫🇷" },
  { country: "Italy", code: "+39", flag: "🇮🇹" },
  { country: "Netherlands", code: "+31", flag: "🇳🇱" },
  { country: "Poland", code: "+48", flag: "🇵🇱" },
  { country: "Portugal", code: "+351", flag: "🇵🇹" },
  { country: "Romania", code: "+40", flag: "🇷🇴" },
  { country: "Sweden", code: "+46", flag: "🇸🇪" },
  { country: "Switzerland", code: "+41", flag: "🇨🇭" },
  { country: "United Kingdom", code: "+44", flag: "🇬🇧" },
  { country: "United States", code: "+1", flag: "🇺🇸" },
  { country: "Canada", code: "+1", flag: "🇨🇦" },
  { country: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { country: "Singapore", code: "+65", flag: "🇸🇬" },
  { country: "Australia", code: "+61", flag: "🇦🇺" },
];

export const DEFAULT_DIAL_CODE = "+359";

/** Lowercased and trimmed. Emails are case-insensitive in practice. */
/**
 * Works out whether what someone typed is an email address or a phone number.
 *
 * An "@" settles it: no phone number contains one, and no address omits it.
 * Otherwise, anything made only of digits and the punctuation people put in
 * phone numbers is treated as a number. Anything else is neither, and the
 * caller says so rather than guessing — asking once beats sending a code to
 * the wrong place.
 */
export function detectChannel(raw: string): AuthChannel | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.includes("@")) return "email";
  if (/^\+?[\d\s().-]{4,}$/.test(value)) return "phone";
  return null;
}

export function normaliseEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Composes a dial code and a national number into E.164 (`+359888123456`).
 *
 * Strips spaces, dashes and brackets, and drops a national trunk prefix — a
 * leading zero — which people habitually type and which must not appear after
 * the country code.
 */
export function normalisePhone(dialCode: string, nationalNumber: string): string {
  const code = dialCode.replace(/[^\d+]/g, "");
  const digits = nationalNumber.replace(/\D/g, "").replace(/^0+/, "");
  return `${code.startsWith("+") ? code : `+${code}`}${digits}`;
}

/** E.164: a plus, a non-zero country digit, then 7–14 more digits. */
export function isValidPhone(e164: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(e164);
}

export function isValidEmail(value: string): boolean {
  // Deliberately permissive: the confirmation code is what actually proves
  // the address works, so the regex only needs to catch obvious typos.
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
}

/**
 * Partially hides a destination for display on the verification screen —
 * enough for the user to recognise it, not enough to leak the full address to
 * someone reading over their shoulder.
 */
export function maskDestination(channel: AuthChannel, value: string): string {
  if (channel === "email") {
    const [local = "", domain = ""] = value.split("@");
    const head = local.slice(0, Math.min(2, local.length));
    return `${head}${"•".repeat(Math.max(1, local.length - head.length))}@${domain}`;
  }
  const tail = value.slice(-3);
  return `${value.slice(0, 4)}${"•".repeat(Math.max(2, value.length - 7))}${tail}`;
}

/** Human label used in copy: "email address" / "phone number". */
export function channelNoun(channel: AuthChannel): string {
  return channel === "email" ? "email address" : "phone number";
}
