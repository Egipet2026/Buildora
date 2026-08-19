import type { UserRole } from "./types";

/**
 * Who may do what.
 *
 * Three roles, and only two questions worth asking about them. Asking through
 * these rather than comparing to a role name means adding a fourth role later
 * is one edit here, not a hunt through every page that happens to gate on
 * something.
 */

/** An owner can do everything an admin can; the reverse is not true. */
export function canAdminister(role: UserRole | undefined): boolean {
  return role === "admin" || role === "owner";
}

/** Reserved for what should stay with the person the platform belongs to. */
export function isOwner(role: UserRole | undefined): boolean {
  return role === "owner";
}

export function roleLabel(role: UserRole): string {
  return role === "owner" ? "Owner" : role === "admin" ? "Admin" : "Member";
}
