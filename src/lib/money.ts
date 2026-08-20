import type { PlatformSettings } from "./types";

/** Fallback settings used before the admin-editable row is loaded. */
export const DEFAULT_SETTINGS: PlatformSettings = {
  commission_bps: 1000, // 10%
  featured_price_cents: 900, // €9
  featured_days: 7,
  boost_price_cents: 500, // €5
  boost_days: 3,
  premium_monthly_cents: 2900, // €29 / month
  verification_fee_cents: 4900, // €49
  currency: "EUR",
};

export interface FeeBreakdown {
  amount_cents: number;
  fee_bps: number;
  fee_cents: number;
  net_cents: number;
  fee_percent: number;
}

/**
 * The core commission calculation: a €50,000 sale at 1000 bps yields a
 * €5,000 platform fee and €45,000 to the seller.
 *
 * Rounding goes to the platform's fee in whole cents so `fee + net` always
 * reconstructs `amount` exactly — no stray cent can appear in a payout.
 */
export function calculateFees(
  amountCents: number,
  feeBps: number = DEFAULT_SETTINGS.commission_bps,
): FeeBreakdown {
  const amount = Math.max(0, Math.round(amountCents));
  const fee = Math.round((amount * feeBps) / 10_000);
  return {
    amount_cents: amount,
    fee_bps: feeBps,
    fee_cents: fee,
    net_cents: amount - fee,
    fee_percent: feeBps / 100,
  };
}

const FORMATTERS = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let f = FORMATTERS.get(key);
  if (!f) {
    f = new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    FORMATTERS.set(key, f);
  }
  return f;
}

/** €45,000 — whole euros unless the amount has a non-zero cent part. */
export function formatMoney(cents: number, currency = "EUR"): string {
  const digits = cents % 100 === 0 ? 0 : 2;
  return formatter(currency, digits).format(cents / 100);
}

/** Compact form for cards and stat tiles: €1.2M, €45K, €900. */
export function formatMoneyCompact(cents: number, currency = "EUR"): string {
  const value = cents / 100;
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${symbol}${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `${symbol}${trim(value / 1_000)}K`;
  return `${symbol}${Math.round(value).toLocaleString("en-IE")}`;
}

function trim(n: number): string {
  return n
    .toFixed(1)
    .replace(/\.0$/, "")
    .replace(/(\.\d)0$/, "$1");
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IE");
}

/**
 * "3 days ago" — relative dates read better than timestamps in feeds.
 *
 * Anything under a minute collapses to "just now" rather than counting
 * seconds. Second-level output would differ between the server render and
 * the client hydration a moment later, which React reports as a mismatch.
 */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";

  const units: [number, Intl.RelativeTimeFormatUnit][] = [
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  // Divisor for the current unit — seconds per minute, for the first row.
  let previous = 60;
  for (const [limit, unit] of units) {
    if (seconds < limit) return rtf.format(-Math.floor(seconds / previous), unit);
    previous = limit;
  }
  return rtf.format(-Math.floor(seconds / 31557600), "year");
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Profit multiple — the headline valuation heuristic in business brokerage.
 * Returns null when annual profit is missing or non-positive so the UI can
 * hide the stat rather than print a misleading number.
 */
export function profitMultiple(
  priceCents: number,
  annualProfitCents?: number,
): number | null {
  if (!annualProfitCents || annualProfitCents <= 0) return null;
  return Math.round((priceCents / annualProfitCents) * 10) / 10;
}
