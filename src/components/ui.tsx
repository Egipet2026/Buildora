import Link from "next/link";
import type { ReactNode } from "react";

/* ------------------------------------------------------------- layout */

export function Section({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`py-14 lg:py-20 ${className}`}>{children}</section>;
}

export function SectionHead({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display text-2xl lg:text-[2rem]">{title}</h2>
        {description ? (
          <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-sm font-semibold text-[var(--color-brand)] hover:underline"
        >
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="shell py-10 lg:py-14">
        {eyebrow ? <p className="eyebrow mb-2.5">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-2xl">
            <h1 className="display text-[2rem] lg:text-[2.75rem]">{title}</h1>
            {description ? (
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)] lg:text-base">
                {description}
              </p>
            ) : null}
          </div>
          {children ? <div className="flex flex-wrap gap-2.5">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- cover */

const PALETTES: [string, string][] = [
  ["#1b4ae0", "#0d9276"],
  ["#0f172a", "#334f8f"],
  ["#7a3ea8", "#1b4ae0"],
  ["#0d9276", "#0f766e"],
  ["#a8720d", "#7a3e0d"],
  ["#c0392b", "#7a1f3d"],
  ["#134e4a", "#0d9276"],
  ["#1e3a8a", "#5b21b6"],
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Deterministic gradient cover with a monogram. Used wherever a listing has
 * no uploaded image — it always renders, never 404s, and stays stable for a
 * given listing across sessions.
 */
export function Cover({
  seed,
  label,
  className = "",
  size = "md",
}: {
  seed: string;
  label: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const [a, b] = PALETTES[hash(seed) % PALETTES.length];
  const monogram = label
    .replace(/[^\p{L}\p{N} ]/gu, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const text =
    size === "lg" ? "text-5xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <div
      className={`cover ${className}`}
      style={{ ["--cover-a" as string]: a, ["--cover-b" as string]: b }}
      aria-hidden
    >
      <span className={`cover-monogram ${text}`}>{monogram || "BH"}</span>
    </div>
  );
}

/* -------------------------------------------------------------- stats */

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "brand" | "accent" | "danger";
}) {
  const color =
    tone === "brand"
      ? "text-[var(--color-brand)]"
      : tone === "accent"
        ? "text-[var(--color-accent)]"
        : tone === "danger"
          ? "text-[var(--color-danger)]"
          : "text-[var(--color-ink)]";

  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <p className={`display mt-2 text-2xl ${color}`}>{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--color-ink-3)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function KeyValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--color-line)] py-2.5 last:border-b-0">
      <dt className="shrink-0 text-[0.8125rem] text-[var(--color-ink-3)]">
        {label}
      </dt>
      <dd className="text-right text-[0.875rem] font-medium text-[var(--color-ink)]">
        {value}
      </dd>
    </div>
  );
}

/* --------------------------------------------------------- empty state */

export function EmptyState({
  icon = "◍",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-xl text-[var(--color-ink-3)]"
        aria-hidden
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-ink-3)]">
        {description}
      </p>
      {action ? (
        <Link href={action.href} className="btn btn-outline btn-sm mt-5">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- notes */

/**
 * Standing disclaimer block. Used anywhere the platform must be explicit that
 * it is a venue, not a guarantor — listings, verification, AI output, fees.
 */
export function Notice({
  tone = "neutral",
  title,
  children,
}: {
  tone?: "neutral" | "brand" | "gold" | "danger";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    neutral: "bg-[var(--color-surface-2)] border-[var(--color-line)]",
    brand: "bg-[var(--color-brand-tint)] border-[#ccd7fb]",
    gold: "bg-[var(--color-gold-tint)] border-[#ecd9b0]",
    danger: "bg-[var(--color-danger-tint)] border-[#f4c9c6]",
  }[tone];

  return (
    <div className={`rounded-[10px] border px-4 py-3.5 ${styles}`}>
      {title ? (
        <p className="mb-1 text-[0.8125rem] font-semibold">{title}</p>
      ) : null}
      <div className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
        {children}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- forms */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? (
          <span className="ml-1 text-[var(--color-danger)]">*</span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="field-error">{error}</p>
      ) : hint ? (
        <p className="field-hint">{hint}</p>
      ) : null}
    </div>
  );
}

