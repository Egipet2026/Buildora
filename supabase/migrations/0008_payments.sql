-- Real payments.
--
-- Until now a purchase recorded a transaction and moved no money. This adds
-- what is needed to take a card payment through Stripe, and — for a sale
-- between two members — to split it so the seller is paid directly and the
-- platform keeps its commission.
--
-- Two ideas are kept apart on purpose:
--
--   payments      every charge the platform initiates, whatever it was for.
--   transactions  a sale of a listing between two members.
--
-- A listing sale writes both. A Featured slot writes only a payment. Keeping
-- them separate means the marketplace's own revenue can be read without
-- filtering it out of the members' trading history.

-- ---------------------------------------------------------------- payouts

-- A seller cannot be paid until they have completed Stripe's onboarding.
-- charges_enabled is Stripe's own answer to "may this account be paid?" and
-- is mirrored here so the buy button can be disabled without an API call on
-- every page view.
alter table public.profiles
  add column if not exists stripe_account_id text,
  add column if not exists stripe_charges_enabled boolean not null default false;

comment on column public.profiles.stripe_account_id is
  'Stripe connected account for payouts. Set when the seller starts onboarding; a payout is only possible once stripe_charges_enabled is true.';

-- --------------------------------------------------------------- payments

create type payment_kind as enum (
  'listing_purchase',
  'featured',
  'boost',
  'verification',
  'premium'
);

create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  kind payment_kind not null,
  /** Set for anything bought against a specific listing. */
  listing_id uuid references public.listings on delete set null,
  amount_cents integer not null check (amount_cents >= 0),
  /** The platform's cut. Equals amount_cents when the platform is the seller. */
  fee_cents integer not null default 0 check (fee_cents >= 0),
  currency text not null default 'EUR',
  status payment_status not null default 'pending',
  /**
   * Stripe's session id, and the unique key that makes the webhook safe to
   * retry: Stripe delivers at least once, and the same session must never
   * activate a Featured slot twice.
   */
  stripe_session_id text unique,
  stripe_payment_intent text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at desc);

comment on table public.payments is
  'Every charge the platform initiates, whatever it was for. Written when checkout starts and settled by the Stripe webhook.';

alter table public.payments enable row level security;

-- A member sees their own payments. Nobody edits them from the browser:
-- every write comes from the server, which uses the service role.
create policy "payments readable by owner" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

-- ----------------------------------------------------------- transactions

alter table public.transactions
  add column if not exists stripe_session_id text unique,
  add column if not exists stripe_payment_intent text;

comment on column public.transactions.stripe_session_id is
  'Links the sale to the Stripe Checkout session that paid for it. Unique, so a redelivered webhook cannot record the same sale twice.';
