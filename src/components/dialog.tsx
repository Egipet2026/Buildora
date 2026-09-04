"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Modal built on the native <dialog> element — focus trapping, Escape and the
 * top layer come from the platform rather than a custom implementation.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        // Clicking the backdrop (the dialog element itself) dismisses.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-[14px] border border-[var(--color-line)] bg-[var(--color-surface)] p-0 text-[var(--color-ink)] backdrop:bg-black/45"
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>
          {description ? (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-1 rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
    </dialog>
  );
}

export function SubmitButton({
  pending,
  children,
  className = "btn btn-brand w-full",
}: {
  pending: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <span className="modern-spinner">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

export function FormMessage({
  state,
}: {
  state: { ok: boolean; message?: string };
}) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2.5 text-[0.8125rem] animate-slide-up ${
        state.ok
          ? "border-[#bfe3d9] bg-[var(--color-accent-tint)] text-[#0a6b57]"
          : "border-[#f4c9c6] bg-[var(--color-danger-tint)] text-[var(--color-danger)]"
      }`}
    >
      {state.message}
    </p>
  );
}
