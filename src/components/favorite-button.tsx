"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavoriteAction } from "@/lib/actions";

/**
 * Save / unsave a listing. Optimistic so the heart responds instantly while
 * the server action settles.
 */
export function FavoriteButton({
  listingId,
  isSaved,
  redirectTo,
  variant = "icon",
}: {
  listingId: string;
  isSaved: boolean;
  redirectTo: string;
  variant?: "icon" | "full";
}) {
  const [saved, setSaved] = useOptimistic(isSaved);
  const [, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      setSaved(!saved);
      const data = new FormData();
      data.set("listingId", listingId);
      data.set("redirectTo", redirectTo);
      await toggleFavoriteAction(data);
    });
  }

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={submit}
        className="btn btn-outline w-full"
        aria-pressed={saved}
      >
        <span aria-hidden>{saved ? "★" : "☆"}</span>
        {saved ? "Saved" : "Save listing"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={submit}
      aria-label={saved ? "Remove from saved" : "Save listing"}
      aria-pressed={saved}
      className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)]/95 text-sm backdrop-blur transition-colors hover:border-[var(--color-ink-3)]"
    >
      <span aria-hidden className={saved ? "text-[var(--color-gold)]" : ""}>
        {saved ? "★" : "☆"}
      </span>
    </button>
  );
}
