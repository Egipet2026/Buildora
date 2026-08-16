import { signOutAction } from "@/lib/auth/actions";

/** Sign-out is a mutation, so it posts rather than being a link. */
export function SignOutButton({
  className = "block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface-2)]",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <form action={signOutAction}>
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
