import type { Profile, Report, Review, Transaction } from "./types";

/**
 * Ratings and the Buildora Trust Score.
 *
 * The score is a summary of what the platform can actually observe about an
 * account — is it verified, has it completed deals, what did the other side
 * say afterwards, how long has it been here, has it been reported. That is
 * all it is. It is not a credit check, not a background check, and not a
 * prediction that a deal will go well, and every surface that shows it says so.
 */

export interface RatingSummary {
  average: number;
  count: number;
  /** Counts for 5,4,3,2,1 stars, in that order. */
  distribution: [number, number, number, number, number];
}

export function summariseRatings(reviews: Review[]): RatingSummary {
  const visible = reviews.filter((r) => !r.is_hidden);
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];

  for (const review of visible) {
    const index = 5 - Math.min(5, Math.max(1, Math.round(review.rating)));
    distribution[index] += 1;
  }

  const total = visible.reduce((sum, r) => sum + r.rating, 0);
  return {
    average: visible.length ? Number((total / visible.length).toFixed(2)) : 0,
    count: visible.length,
    distribution,
  };
}

export interface TrustFactor {
  label: string;
  /** Points contributed, positive or negative. */
  points: number;
  detail: string;
}

export interface TrustScore {
  /** 0–100. */
  score: number;
  band: "new" | "building" | "established" | "trusted";
  factors: TrustFactor[];
}

const BANDS: { min: number; band: TrustScore["band"]; }[] = [
  { min: 80, band: "trusted" },
  { min: 55, band: "established" },
  { min: 30, band: "building" },
  { min: 0, band: "new" },
];

export function trustBandLabel(band: TrustScore["band"]): string {
  return {
    new: "New account",
    building: "Building a record",
    established: "Established",
    trusted: "Strong record",
  }[band];
}

/**
 * Computes the score from observable facts.
 *
 * Weightings favour evidence that is hard to fake: a completed transaction and
 * a review attached to it cost real money to manufacture, while account age
 * costs only patience, and so is worth less.
 */
export function trustScore(input: {
  profile: Profile;
  transactions: Transaction[];
  reviews: Review[];
  reports: Report[];
}): TrustScore {
  const { profile, transactions, reviews, reports } = input;
  const factors: TrustFactor[] = [];
  let score = 0;

  /* ------------------------------------------------------- verification */
  if (profile.is_verified) {
    score += 25;
    factors.push({
      label: "Verified",
      points: 25,
      detail: "Identity and details evidenced to Buildora and checked.",
    });
  } else {
    factors.push({
      label: "Not verified",
      points: 0,
      detail: "This account has not completed verification.",
    });
  }

  /* -------------------------------------------------------- completed deals */
  const settled = transactions.filter(
    (t) => t.status === "released" || t.status === "paid",
  );
  if (settled.length) {
    const points = Math.min(25, settled.length * 6);
    score += points;
    factors.push({
      label: `${settled.length} completed ${settled.length === 1 ? "deal" : "deals"}`,
      points,
      detail: "Transactions recorded on the platform and seen through to the end.",
    });
  } else {
    factors.push({
      label: "No completed deals yet",
      points: 0,
      detail: "Nothing has gone through Buildora with this account so far.",
    });
  }

  /* ---------------------------------------------------------------- reviews */
  const rating = summariseRatings(reviews);
  if (rating.count) {
    // Anything at or above 3 stars earns; below it, it costs.
    const points = Math.round(
      Math.min(25, rating.count * 5) * ((rating.average - 3) / 2),
    );
    score += points;
    factors.push({
      label: `${rating.average.toFixed(1)} from ${rating.count} ${rating.count === 1 ? "review" : "reviews"}`,
      points,
      detail: "Left by the other side after a completed transaction.",
    });
  } else {
    factors.push({
      label: "No reviews yet",
      points: 0,
      detail: "Reviews can only be left after a completed deal.",
    });
  }

  /* ------------------------------------------------------------ account age */
  const days = Math.floor(
    (Date.now() - new Date(profile.created_at).getTime()) / 86_400_000,
  );
  const agePoints = Math.min(15, Math.floor(days / 30) * 3);
  if (agePoints > 0) {
    score += agePoints;
    factors.push({
      label: `Member for ${days < 60 ? `${days} days` : `${Math.floor(days / 30)} months`}`,
      points: agePoints,
      detail: "Account age. Worth the least here — it costs nothing but time.",
    });
  }

  /* ---------------------------------------------------------------- reports */
  const upheld = reports.filter((r) => r.status === "resolved");
  if (upheld.length) {
    const points = -Math.min(40, upheld.length * 20);
    score += points;
    factors.push({
      label: `${upheld.length} upheld ${upheld.length === 1 ? "report" : "reports"}`,
      points,
      detail: "A moderator reviewed a complaint about this account and acted on it.",
    });
  }

  if (profile.is_blocked) {
    score = 0;
    factors.push({
      label: "Suspended",
      points: 0,
      detail: "This account is suspended and cannot transact.",
    });
  }

  const final = Math.max(0, Math.min(100, score));
  return {
    score: final,
    band: BANDS.find((b) => final >= b.min)!.band,
    factors,
  };
}
