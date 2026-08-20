/**
 * Core domain types for Buildora.
 *
 * These mirror the Postgres schema in `supabase/migrations/0001_init.sql`
 * one-to-one so the same shapes flow through the demo data layer and a real
 * Supabase project without any translation step.
 */

/** The nine marketplaces that live under one listing table. */
export type ListingKind =
  | "business"
  | "patent"
  | "digital_asset"
  | "service"
  | "partner"
  | "idea"
  | "product"
  | "ai_tool"
  | "marketing";

export type ListingStatus =
  | "draft"
  | "pending"
  | "active"
  | "rejected"
  | "sold"
  | "archived";

/** How the asset changes hands. Patents may be sold outright or licensed. */
export type DealType =
  | "purchase"
  | "license_exclusive"
  | "license_non_exclusive";

export type UserRole = "user" | "admin" | "owner";

export type VerificationStatus =
  | "none"
  | "pending"
  | "verified"
  | "rejected";

export type OfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "countered"
  | "withdrawn";

export type TransactionStatus =
  | "pending"
  | "paid"
  | "released"
  | "cancelled";

export type PremiumTier = "free" | "premium" | "pro";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  country: string | null;
  role: UserRole;
  /** Verified Seller badge. Confirms identity/details only — never quality. */
  is_verified: boolean;
  verification_status: VerificationStatus;
  is_blocked: boolean;
  premium_tier: PremiumTier;
  /**
   * The seller's Stripe connected account, once they have started onboarding.
   * A payout is only possible when Stripe has also said charges are enabled.
   */
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  kind: ListingKind;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

/** Financials. Stored in minor units (cents) to avoid float drift. */
export interface ListingMetrics {
  annual_revenue_cents?: number;
  monthly_revenue_cents?: number;
  annual_expenses_cents?: number;
  monthly_profit_cents?: number;
  annual_profit_cents?: number;
  customers?: number;
  team_size?: number;
}

/** Kind-specific fields. Kept as JSONB so new marketplaces need no migration. */
export interface ListingAttributes {
  // Businesses
  business_model?: string;
  year_founded?: number;
  website?: string;
  socials?: { label: string; url: string }[];
  reason_for_selling?: string;
  assets_included?: string[];
  is_online?: boolean;

  // Patents & technologies
  patent_number?: string;
  jurisdiction?: string;
  patent_status?: string;
  rights_holder?: string;
  filing_date?: string;
  technology_field?: string;
  license_price_cents?: number;
  license_period?: string;
  deal_types?: DealType[];

  // Services & experts
  skills?: string[];
  experience_years?: number;
  portfolio?: { title: string; url: string }[];
  rate_unit?: string;

  // Partners
  investment_required_cents?: number;
  commitment?: string;
  remote?: boolean;

  // Digital assets
  tech_stack?: string[];
  monthly_users?: number;
}

export interface ListingDocument {
  name: string;
  /** Storage path, not a public URL — access is brokered per request. */
  path: string;
  /** Buyers only see documents after the seller accepts an offer. */
  visibility: "public" | "on_request" | "after_offer";
}

export interface Listing {
  id: string;
  owner_id: string;
  kind: ListingKind;
  category_slug: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  country: string;
  currency: string;
  price_cents: number;
  deal_types: DealType[];
  status: ListingStatus;
  is_verified: boolean;
  is_featured: boolean;
  featured_until: string | null;
  boosted_until: string | null;
  views_count: number;
  saves_count: number;
  cover_url: string | null;
  gallery: string[];
  metrics: ListingMetrics;
  attributes: ListingAttributes;
  documents: ListingDocument[];
  rejection_reason: string | null;
  created_at: string;
  published_at: string | null;
}

/** A listing joined with its seller — what listing cards and pages render. */
export interface ListingWithOwner extends Listing {
  owner: Profile;
}

export interface Offer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  deal_type: DealType;
  message: string;
  status: OfferStatus;
  /** Counter-offers chain to their parent so the full history is preserved. */
  parent_offer_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachments: { name: string; path: string }[];
  read_at: string | null;
  created_at: string;
}

export interface Favorite {
  user_id: string;
  listing_id: string;
  created_at: string;
}

export type NotificationType =
  | "offer_received"
  | "offer_countered"
  | "offer_accepted"
  | "offer_rejected"
  | "message_received"
  | "listing_approved"
  | "listing_rejected"
  | "price_changed"
  | "saved_listing_update"
  | "new_match";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount_cents: number;
  /** Commission in basis points. 1000 bps = the standard 10%. */
  fee_bps: number;
  fee_cents: number;
  net_cents: number;
  status: TransactionStatus;
  /** "mock" for the MVP. Swapped for a real marketplace PSP later. */
  provider: string;
  created_at: string;
}

/** What a charge was for. Anything not a listing sale is platform revenue. */
export type PaymentKind =
  | "listing_purchase"
  | "featured"
  | "boost"
  | "verification"
  | "premium";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

/**
 * One charge the platform initiated.
 *
 * Written when checkout starts and settled by Stripe's webhook, so a row in
 * `pending` means the customer opened a payment page and either has not
 * finished or never will.
 */
export interface Payment {
  id: string;
  user_id: string;
  kind: PaymentKind;
  listing_id: string | null;
  amount_cents: number;
  /** The platform's cut. Equals amount_cents when the platform is the seller. */
  fee_cents: number;
  currency: string;
  status: PaymentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface Report {
  id: string;
  reporter_id: string;
  target_type: "listing" | "user" | "message";
  target_id: string;
  reason: string;
  details: string;
  status: "open" | "reviewing" | "resolved" | "dismissed";
  created_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  listing_id: string | null;
  kind: "seller" | "business" | "patent";
  evidence: { label: string; value: string }[];
  status: VerificationStatus;
  notes: string | null;
  created_at: string;
}

export interface BusinessProfile {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string;
  website: string | null;
  industry: string;
  country: string;
  team: { name: string; role: string }[];
  products: string[];
  services: string[];
  goals: string;
  looking_for: string[];
  created_at: string;
}

/**
 * A product or service the business actually sells, published on its own
 * storefront. This is what makes a business profile a working shop rather than
 * a description of one: prices, stock and availability that the owner keeps
 * up to date from their workspace.
 */
export interface BusinessProduct {
  id: string;
  business_id: string;
  owner_id: string;
  name: string;
  description: string;
  /** Null means the price is on request. */
  price_cents: number | null;
  currency: string;
  unit: string | null;
  sku: string | null;
  /** Null means made to order — no stock is tracked. */
  stock: number | null;
  image_url: string | null;
  status: ProductStatus;
  created_at: string;
}

export type ProductStatus = "draft" | "published" | "out_of_stock";

export type MilestoneStage = "validate" | "set_up" | "launch" | "grow";

/**
 * One step in the business's build plan. A starter checklist can seed these,
 * but they are ordinary editable records afterwards — the plan is a working
 * checklist the owner owns, not a template they are stuck with.
 */
export interface BusinessMilestone {
  id: string;
  business_id: string;
  title: string;
  detail: string | null;
  stage: MilestoneStage;
  is_done: boolean;
  position: number;
  created_at: string;
  completed_at: string | null;
}

/* ------------------------------------------------- watchlist and alerts */

/**
 * A listing the member is tracking.
 *
 * The price at the moment of adding is copied in, which is what makes a drop
 * detectable later without keeping a full price history for every listing on
 * the platform.
 */
export interface WatchItem {
  id: string;
  user_id: string;
  listing_id: string;
  price_when_added_cents: number | null;
  /** Most recent price we told the member about, so one drop alerts once. */
  last_seen_price_cents: number | null;
  note: string | null;
  created_at: string;
}

/** A standing search that raises a notification when something new matches. */
export interface OpportunityAlert {
  id: string;
  user_id: string;
  label: string;
  kinds: ListingKind[];
  max_price_cents: number | null;
  min_price_cents: number | null;
  country: string | null;
  query: string;
  verified_only: boolean;
  is_active: boolean;
  /** Ids already notified about, so the same listing never alerts twice. */
  notified_listing_ids: string[];
  last_checked_at: string | null;
  created_at: string;
}

/* --------------------------------------------------- reviews and ratings */

export type ReviewSubject = "seller" | "buyer" | "expert" | "business";

export interface Review {
  id: string;
  subject_type: ReviewSubject;
  /** Profile id, or business profile id when subject_type is "business". */
  subject_id: string;
  author_id: string;
  /**
   * The deal this review is evidence of. Reviews without one are not
   * accepted — it is the main defence against invented feedback.
   */
  transaction_id: string;
  rating: number;
  title: string;
  body: string;
  /** Hidden by a moderator rather than deleted, so the audit trail survives. */
  is_hidden: boolean;
  created_at: string;
}

/* -------------------------------------------------------- co-founding */

export interface FounderProfile {
  id: string;
  user_id: string;
  headline: string;
  skills: string[];
  experience: string;
  industry: string;
  location: string;
  /** Hours a week they can actually commit. */
  hours_per_week: number;
  building: string;
  contributes: string;
  /** The skills they are missing and want a co-founder to cover. */
  seeking: string[];
  is_open: boolean;
  created_at: string;
}

/* ------------------------------------------------------ goals & metrics */

export type GoalKind = "revenue" | "customers" | "products" | "growth" | "team";

export interface BusinessGoal {
  id: string;
  business_id: string;
  kind: GoalKind;
  label: string;
  /** Money goals are in cents; everything else is a plain count. */
  target: number;
  current: number;
  unit: string;
  due_on: string | null;
  created_at: string;
}

/** One month of self-reported figures, for the business dashboard. */
export interface BusinessMetric {
  id: string;
  business_id: string;
  /** "2026-08" — one row per month. */
  month: string;
  revenue_cents: number;
  expenses_cents: number;
  customers: number;
  created_at: string;
}

/* ------------------------------------------------------------- network */

export type FollowTarget = "member" | "business";

export interface Follow {
  id: string;
  follower_id: string;
  target_type: FollowTarget;
  target_id: string;
  created_at: string;
}

export type PostKind = "update" | "opportunity" | "milestone";

export interface Post {
  id: string;
  author_id: string;
  business_id: string | null;
  kind: PostKind;
  body: string;
  /** An internal path — a listing, a business, an opportunity. */
  link: string | null;
  link_label: string | null;
  created_at: string;
}

export interface PlatformSettings {
  commission_bps: number;
  featured_price_cents: number;
  featured_days: number;
  boost_price_cents: number;
  boost_days: number;
  premium_monthly_cents: number;
  verification_fee_cents: number;
  currency: string;
}
