-- ===========================================================================
-- Bizora — complete database setup, in one file.
--
-- Copy this whole file into the Supabase SQL Editor and press Run, once.
-- It is the four migration files in supabase/migrations/ joined in order, so
-- you do not have to run them one at a time.
--
-- Run it on a NEW, EMPTY Supabase project. On a project that already has
-- Bizora tables it will fail on the first "already exists" — that is safe,
-- nothing is changed, but use the individual migration files instead.
-- ===========================================================================


-- ===========================================================================
-- 0001_init.sql
-- ===========================================================================

-- ===========================================================================
-- Bizora — initial schema
--
-- Run against a fresh Supabase project:
--   supabase db push          (or paste into the SQL editor)
--
-- Every table has Row Level Security enabled with explicit policies. The
-- default posture is deny: a policy has to grant access before anything is
-- readable or writable.
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums

create type listing_kind as enum (
  'business', 'patent', 'digital_asset', 'service',
  'partner', 'idea', 'product', 'ai_tool', 'marketing'
);

create type listing_status as enum (
  'draft', 'pending', 'active', 'rejected', 'sold', 'archived'
);

create type deal_type as enum (
  'purchase', 'license_exclusive', 'license_non_exclusive'
);

create type user_role as enum ('user', 'admin');

create type verification_status as enum ('none', 'pending', 'verified', 'rejected');

create type offer_status as enum (
  'pending', 'accepted', 'rejected', 'countered', 'withdrawn'
);

create type transaction_status as enum ('pending', 'paid', 'released', 'cancelled');

create type premium_tier as enum ('free', 'premium', 'pro');

create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

-- ------------------------------------------------------------- profiles

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null default 'New member',
  avatar_url text,
  headline text,
  bio text,
  country text,
  role user_role not null default 'user',
  is_verified boolean not null default false,
  verification_status verification_status not null default 'none',
  is_blocked boolean not null default false,
  premium_tier premium_tier not null default 'free',
  created_at timestamptz not null default now()
);

-- Creates the profile row automatically on sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Read-only helper used inside policies. SECURITY DEFINER so the policy can
-- check the caller's role without recursing into profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_blocked()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_blocked from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------- listings

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  kind listing_kind not null,
  category_slug text not null,
  title text not null,
  slug text not null unique,
  summary text not null,
  description text not null,
  country text not null,
  currency text not null default 'EUR',
  price_cents bigint not null default 0 check (price_cents >= 0),
  deal_types deal_type[] not null default '{purchase}',
  status listing_status not null default 'pending',
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  featured_until timestamptz,
  boosted_until timestamptz,
  views_count integer not null default 0,
  saves_count integer not null default 0,
  cover_url text,
  gallery jsonb not null default '[]',
  metrics jsonb not null default '{}',
  attributes jsonb not null default '{}',
  documents jsonb not null default '[]',
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create index listings_kind_status_idx on public.listings (kind, status);
create index listings_owner_idx on public.listings (owner_id);
create index listings_price_idx on public.listings (price_cents);
create index listings_published_idx on public.listings (published_at desc);

-- --------------------------------------------------------------- offers

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete cascade,
  buyer_id uuid not null references public.profiles on delete cascade,
  seller_id uuid not null references public.profiles on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  deal_type deal_type not null default 'purchase',
  message text not null default '',
  status offer_status not null default 'pending',
  -- Counter-offers point at the offer they answer, preserving the full
  -- negotiation history as an append-only chain.
  parent_offer_id uuid references public.offers on delete set null,
  created_at timestamptz not null default now(),
  constraint offers_not_self check (buyer_id <> seller_id)
);

create index offers_listing_idx on public.offers (listing_id);
create index offers_buyer_idx on public.offers (buyer_id);
create index offers_seller_idx on public.offers (seller_id);

-- ------------------------------------------------------------ messaging

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings on delete set null,
  buyer_id uuid not null references public.profiles on delete cascade,
  seller_id uuid not null references public.profiles on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id, seller_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade,
  body text not null check (char_length(body) between 1 and 6000),
  attachments jsonb not null default '[]',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- Membership test used by the messaging policies.
create or replace function public.in_conversation(conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conversation
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  );
$$;

-- ------------------------------------------------------------ favorites

create table public.favorites (
  user_id uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- -------------------------------------------------------- notifications

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- --------------------------------------------------------- transactions

-- Records the agreed price and the commission split. The MVP moves no money:
-- provider is 'mock' until a marketplace payment provider is integrated and
-- the corresponding legal and compliance requirements are met.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings on delete restrict,
  buyer_id uuid not null references public.profiles on delete restrict,
  seller_id uuid not null references public.profiles on delete restrict,
  amount_cents bigint not null check (amount_cents >= 0),
  fee_bps integer not null default 1000,
  fee_cents bigint not null,
  net_cents bigint not null,
  status transaction_status not null default 'pending',
  provider text not null default 'mock',
  created_at timestamptz not null default now(),
  constraint transactions_split_balances check (fee_cents + net_cents = amount_cents)
);

-- -------------------------------------------------- reports & verification

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles on delete cascade,
  target_type text not null check (target_type in ('listing', 'user', 'message')),
  target_id uuid not null,
  reason text not null,
  details text not null default '',
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  listing_id uuid references public.listings on delete cascade,
  kind text not null check (kind in ('seller', 'business', 'patent')),
  evidence jsonb not null default '[]',
  status verification_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------- business profiles

create table public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  description text not null default '',
  website text,
  industry text not null default '',
  country text not null default '',
  team jsonb not null default '[]',
  products jsonb not null default '[]',
  services jsonb not null default '[]',
  goals text not null default '',
  looking_for text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------- platform settings

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values (
  'pricing',
  jsonb_build_object(
    'commission_bps', 1000,
    'featured_price_cents', 900,
    'featured_days', 7,
    'boost_price_cents', 500,
    'boost_days', 3,
    'premium_monthly_cents', 2900,
    'verification_fee_cents', 4900,
    'analyzer_price_cents', 1900,
    'currency', 'EUR'
  )
) on conflict (key) do nothing;

-- ===========================================================================
-- Row Level Security
-- ===========================================================================

alter table public.profiles             enable row level security;
alter table public.listings             enable row level security;
alter table public.offers               enable row level security;
alter table public.conversations        enable row level security;
alter table public.messages             enable row level security;
alter table public.favorites            enable row level security;
alter table public.notifications        enable row level security;
alter table public.transactions         enable row level security;
alter table public.reports              enable row level security;
alter table public.verification_requests enable row level security;
alter table public.business_profiles    enable row level security;
alter table public.platform_settings    enable row level security;

-- --- profiles --------------------------------------------------------------
-- Public columns are readable by anyone (seller name, badge). Email lives in
-- auth.users and is never exposed through this table.
create policy "profiles readable" on public.profiles
  for select using (true);

create policy "own profile update" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "admin profile write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- --- listings --------------------------------------------------------------
create policy "active listings public" on public.listings
  for select using (
    status in ('active', 'sold')
    or owner_id = auth.uid()
    or public.is_admin()
  );

create policy "owner creates listing" on public.listings
  for insert with check (
    owner_id = auth.uid()
    and not public.is_blocked()
    -- Sellers cannot self-publish, self-verify or self-promote. Moderation
    -- and paid placement are applied server-side by an admin or a settled
    -- promotion, never by the submitter.
    and status in ('draft', 'pending')
    and is_verified = false
    and is_featured = false
  );

create policy "owner edits own listing" on public.listings
  for update using (owner_id = auth.uid() and not public.is_blocked())
  with check (owner_id = auth.uid() and is_verified = false);

create policy "owner deletes own listing" on public.listings
  for delete using (owner_id = auth.uid());

create policy "admin listing write" on public.listings
  for all using (public.is_admin()) with check (public.is_admin());

-- --- offers ----------------------------------------------------------------
-- An offer is private to its two parties. Nobody else can see what was bid.
create policy "offer parties read" on public.offers
  for select using (
    buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin()
  );

create policy "buyer or seller creates offer" on public.offers
  for insert with check (
    (buyer_id = auth.uid() or seller_id = auth.uid())
    and not public.is_blocked()
    and status = 'pending'
    and exists (
      select 1 from public.listings l
      where l.id = listing_id and l.owner_id = offers.seller_id
    )
  );

create policy "offer parties update" on public.offers
  for update using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

-- --- conversations & messages ---------------------------------------------
create policy "conversation parties read" on public.conversations
  for select using (
    buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin()
  );

create policy "buyer starts conversation" on public.conversations
  for insert with check (buyer_id = auth.uid() and not public.is_blocked());

create policy "conversation parties update" on public.conversations
  for update using (buyer_id = auth.uid() or seller_id = auth.uid())
  with check (buyer_id = auth.uid() or seller_id = auth.uid());

create policy "conversation members read messages" on public.messages
  for select using (public.in_conversation(conversation_id) or public.is_admin());

create policy "conversation members send" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and public.in_conversation(conversation_id)
    and not public.is_blocked()
  );

-- Recipients mark messages read; senders cannot rewrite what they sent.
create policy "recipient marks read" on public.messages
  for update using (
    public.in_conversation(conversation_id) and sender_id <> auth.uid()
  )
  with check (public.in_conversation(conversation_id));

-- --- favorites -------------------------------------------------------------
create policy "own favorites" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --- notifications ---------------------------------------------------------
create policy "own notifications read" on public.notifications
  for select using (user_id = auth.uid());

create policy "own notifications update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Notifications are written by server-side flows (service role) and by the
-- counterparty action that triggers them.
create policy "authenticated notification insert" on public.notifications
  for insert with check (auth.uid() is not null and not public.is_blocked());

-- --- transactions ----------------------------------------------------------
create policy "transaction parties read" on public.transactions
  for select using (
    buyer_id = auth.uid() or seller_id = auth.uid() or public.is_admin()
  );

create policy "buyer records transaction" on public.transactions
  for insert with check (buyer_id = auth.uid() and not public.is_blocked());

create policy "admin transaction write" on public.transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- --- reports ---------------------------------------------------------------
create policy "reporter reads own" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());

create policy "authenticated reports" on public.reports
  for insert with check (reporter_id = auth.uid());

create policy "admin report write" on public.reports
  for all using (public.is_admin()) with check (public.is_admin());

-- --- verification ----------------------------------------------------------
create policy "requester reads own verification" on public.verification_requests
  for select using (user_id = auth.uid() or public.is_admin());

create policy "requester submits verification" on public.verification_requests
  for insert with check (user_id = auth.uid() and status = 'pending');

create policy "admin verification write" on public.verification_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- --- business profiles -----------------------------------------------------
create policy "business profiles public" on public.business_profiles
  for select using (true);

create policy "owner writes business profile" on public.business_profiles
  for all using (owner_id = auth.uid() and not public.is_blocked())
  with check (owner_id = auth.uid());

-- --- platform settings -----------------------------------------------------
create policy "settings readable" on public.platform_settings
  for select using (true);

create policy "admin settings write" on public.platform_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- Storage
-- ===========================================================================

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Documents are private. Access is brokered by the application, which issues
-- short-lived signed URLs only to parties entitled to see a given document.
insert into storage.buckets (id, name, public)
values ('listing-documents', 'listing-documents', false)
on conflict (id) do nothing;

-- Uploads are namespaced by user id: <uid>/<listing>/<file>.
create policy "public read listing images" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "own folder image upload" on storage.objects
  for insert with check (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own folder image delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "own documents read" on storage.objects
  for select using (
    bucket_id = 'listing-documents'
    and (auth.uid()::text = (storage.foldername(name))[1] or public.is_admin())
  );

create policy "own documents upload" on storage.objects
  for insert with check (
    bucket_id = 'listing-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ===========================================================================
-- 0002_phone_signup.sql
-- ===========================================================================

-- Phone sign-up support.
--
-- Members can now register with a phone number instead of an email address, so
-- auth.users.email may be null. The original trigger derived the display name
-- from the email local part alone, which produced NULL for a phone-only
-- sign-up and failed against profiles.full_name NOT NULL — the account was
-- created but its profile was not.
--
-- The phone number itself is deliberately NOT copied into profiles: that table
-- is readable by everyone ("profiles readable"), and a member's number is not
-- public information. It stays in auth.users, where only the member and the
-- service role can see it.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New member'
    )
  );
  return new;
end;
$$;


-- ===========================================================================
-- 0003_workspace.sql
-- ===========================================================================

-- The business workspace: a storefront and a build plan.
--
-- A business profile used to be a description — arrays of product and service
-- names. These two tables make it a working thing: items with prices and stock
-- that the owner keeps current, and a checklist they tick off as the business
-- develops.

create type product_status as enum ('draft', 'published', 'out_of_stock');
create type milestone_stage as enum ('validate', 'set_up', 'launch', 'grow');

create table public.business_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles on delete cascade,
  owner_id uuid not null references public.profiles on delete cascade,
  name text not null check (char_length(name) between 2 and 140),
  description text not null check (char_length(description) between 20 and 4000),
  -- Null is a real state: price on request, which is normal in B2B.
  price_cents bigint check (price_cents is null or price_cents >= 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  unit text,
  sku text,
  -- Null means made to order, so no stock is tracked.
  stock integer check (stock is null or stock >= 0),
  image_url text,
  status product_status not null default 'draft',
  created_at timestamptz not null default now()
);

create index business_products_business_idx
  on public.business_products (business_id, status);

create table public.business_milestones (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles on delete cascade,
  title text not null check (char_length(title) between 3 and 180),
  detail text,
  stage milestone_stage not null default 'validate',
  is_done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index business_milestones_business_idx
  on public.business_milestones (business_id, position);

-- Direct member-to-member conversations carry no listing. Postgres treats
-- NULLs as distinct in a unique constraint, so the original
-- unique (listing_id, buyer_id, seller_id) would allow unlimited duplicate
-- direct threads between the same two people. This closes that, in both
-- directions.
create unique index conversations_direct_pair_idx
  on public.conversations (least(buyer_id, seller_id), greatest(buyer_id, seller_id))
  where listing_id is null;

alter table public.business_products   enable row level security;
alter table public.business_milestones enable row level security;

-- Anyone may read a published product; only the owner sees their drafts.
create policy "published products readable" on public.business_products
  for select using (status <> 'draft' or owner_id = auth.uid());

create policy "owner writes products" on public.business_products
  for all
  using (owner_id = auth.uid() and not public.is_blocked())
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- The build plan is private working material, not a public page.
create policy "owner reads milestones" on public.business_milestones
  for select using (
    exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

create policy "owner writes milestones" on public.business_milestones
  for all
  using (
    not public.is_blocked()
    and exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );


-- ===========================================================================
-- 0004_ecosystem.sql
-- ===========================================================================

-- The ecosystem modules: watchlist, opportunity alerts, reviews, co-founder
-- profiles, goals, monthly figures and the network feed.
--
-- Each is independent of the others and of the marketplace itself, so any one
-- of them can be dropped without breaking buying and selling.

/* ---------------------------------------------------------------- watchlist */

create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  listing_id uuid not null references public.listings on delete cascade,
  -- The price when it was added, which is what makes a later drop detectable.
  price_when_added_cents bigint,
  last_seen_price_cents bigint,
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index watchlist_listing_idx on public.watchlist (listing_id);

/* ------------------------------------------------------------------ alerts */

create table public.opportunity_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles on delete cascade,
  label text not null check (char_length(label) between 3 and 120),
  kinds listing_kind[] not null default '{}',
  max_price_cents bigint,
  min_price_cents bigint,
  country text,
  query text not null default '',
  verified_only boolean not null default false,
  is_active boolean not null default true,
  -- Listings already announced, so one listing never alerts the same member
  -- twice however often it is re-approved.
  notified_listing_ids uuid[] not null default '{}',
  last_checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index opportunity_alerts_active_idx
  on public.opportunity_alerts (is_active) where is_active;

/* ----------------------------------------------------------------- reviews */

create type review_subject as enum ('seller', 'buyer', 'expert', 'business');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type review_subject not null,
  subject_id uuid not null,
  author_id uuid not null references public.profiles on delete cascade,
  -- Not nullable, and unique per author: a review must be evidence of a deal
  -- that actually happened, and one deal earns one review.
  transaction_id uuid not null references public.transactions on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 4 and 120),
  body text not null check (char_length(body) between 30 and 4000),
  -- Hidden by a moderator rather than deleted, so the record survives.
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  unique (transaction_id, author_id)
);

create index reviews_subject_idx on public.reviews (subject_id, is_hidden);

/* ------------------------------------------------------------- co-founders */

create table public.founder_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles on delete cascade,
  headline text not null check (char_length(headline) between 10 and 160),
  skills text[] not null default '{}',
  experience text not null,
  industry text not null,
  location text not null,
  hours_per_week integer not null check (hours_per_week between 1 and 80),
  building text not null,
  contributes text not null,
  seeking text[] not null default '{}',
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

/* ------------------------------------------------------- goals and metrics */

create type goal_kind as enum ('revenue', 'customers', 'products', 'growth', 'team');

create table public.business_goals (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles on delete cascade,
  kind goal_kind not null,
  label text not null check (char_length(label) between 3 and 120),
  -- Money goals are in cents; every other kind is a plain count.
  target bigint not null check (target >= 0),
  current bigint not null default 0 check (current >= 0),
  unit text not null default 'EUR',
  due_on date,
  created_at timestamptz not null default now()
);

create index business_goals_business_idx on public.business_goals (business_id);

create table public.business_metrics (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.business_profiles on delete cascade,
  -- One row per business per month; re-saving a month overwrites it.
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  revenue_cents bigint not null default 0,
  expenses_cents bigint not null default 0,
  customers integer not null default 0,
  created_at timestamptz not null default now(),
  unique (business_id, month)
);

/* ----------------------------------------------------------------- network */

create type follow_target as enum ('member', 'business');
create type post_kind as enum ('update', 'opportunity', 'milestone');

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references public.profiles on delete cascade,
  target_type follow_target not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (follower_id, target_type, target_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles on delete cascade,
  business_id uuid references public.business_profiles on delete set null,
  kind post_kind not null default 'update',
  body text not null check (char_length(body) between 20 and 2000),
  link text,
  link_label text,
  created_at timestamptz not null default now()
);

create index posts_created_idx on public.posts (created_at desc);

/* --------------------------------------------------------------------- RLS */

alter table public.watchlist           enable row level security;
alter table public.opportunity_alerts  enable row level security;
alter table public.reviews             enable row level security;
alter table public.founder_profiles    enable row level security;
alter table public.business_goals      enable row level security;
alter table public.business_metrics    enable row level security;
alter table public.follows             enable row level security;
alter table public.posts               enable row level security;

-- A watchlist and its alerts are private to the member who made them.
create policy "own watchlist" on public.watchlist
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own alerts" on public.opportunity_alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Reviews are public once written, and cannot be edited or deleted by anyone
-- except an admin — including their author. A review the subject can pressure
-- someone into removing is not worth reading.
create policy "reviews readable" on public.reviews
  for select using (not is_hidden or author_id = auth.uid() or public.is_admin());

create policy "write own review" on public.reviews
  for insert
  with check (
    author_id = auth.uid()
    and not public.is_blocked()
    -- Only a party to a completed transaction may review it.
    and exists (
      select 1 from public.transactions t
      where t.id = transaction_id
        and t.status in ('paid', 'released')
        and (t.buyer_id = auth.uid() or t.seller_id = auth.uid())
        -- And only about the other side of it.
        and subject_id = case
              when t.buyer_id = auth.uid() then t.seller_id
              else t.buyer_id
            end
    )
  );

create policy "admin moderates reviews" on public.reviews
  for update using (public.is_admin());

-- Co-founder profiles are public while open, and always visible to their owner.
create policy "founder profiles readable" on public.founder_profiles
  for select using (is_open or user_id = auth.uid());

create policy "own founder profile" on public.founder_profiles
  for all
  using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid());

-- Goals and monthly figures are private working material.
create policy "own goals" on public.business_goals
  for all
  using (
    exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

create policy "own metrics" on public.business_metrics
  for all
  using (
    exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.business_profiles b
      where b.id = business_id and b.owner_id = auth.uid()
    )
  );

-- The feed is public to read; you may only speak as yourself.
create policy "follows readable" on public.follows for select using (true);

create policy "own follows" on public.follows
  for all
  using (follower_id = auth.uid()) with check (follower_id = auth.uid());

create policy "posts readable" on public.posts for select using (true);

create policy "own posts" on public.posts
  for all
  using (author_id = auth.uid() and not public.is_blocked())
  with check (author_id = auth.uid());

create policy "admin removes posts" on public.posts
  for delete using (public.is_admin());


-- ===========================================================================
-- 0005_table_comments.sql
-- ===========================================================================

-- Descriptions for the main tables.
--
-- These show up in the Supabase table editor and in `\d+` on the command line,
-- so anyone opening the database later can tell what each table holds without
-- reading the application. Comments are idempotent: re-running this replaces
-- the text rather than failing.

comment on table public.profiles is
  'One row per member, created automatically on sign-up. Publicly readable — email addresses and phone numbers stay in auth.users and are never copied here.';

comment on table public.listings is
  'Everything for sale across all nine marketplaces. Kind-specific fields live in the attributes JSONB column so a new marketplace needs no migration.';

comment on table public.offers is
  'Offers and counter-offers. A counter chains to its parent via parent_offer_id, so the full negotiation history is preserved rather than overwritten.';

comment on table public.conversations is
  'A message thread. listing_id is null for a direct member-to-member conversation.';

comment on table public.messages is
  'Messages within a conversation. Readable only by the two participants, enforced by a SECURITY DEFINER membership check.';

comment on table public.transactions is
  'Recorded deals and the commission split. The MVP moves no money — provider is "mock" — but the fee split is stored per transaction so payouts are later a provider integration, not a schema change.';

comment on table public.verification_requests is
  'Evidence a member submitted for a Verified badge. Verification confirms supplied details only; it is never a judgement of quality or a recommendation.';

comment on table public.business_profiles is
  'A business someone runs on the platform, as opposed to one they are selling.';

comment on table public.business_products is
  'The storefront: items a business actually sells, with prices and stock. Drafts are visible only to the owner.';

comment on table public.business_milestones is
  'The build plan — a private checklist. The AI planner can seed it, but the owner owns and edits the rows afterwards.';

comment on table public.business_goals is
  'Targets the owner sets and updates by hand. Money goals are stored in cents.';

comment on table public.business_metrics is
  'Self-reported monthly figures behind the business dashboard. Not connected to any bank or accounting system, and not audited.';

comment on table public.watchlist is
  'Listings a member is tracking. price_when_added_cents is what makes a later price drop detectable.';

comment on table public.opportunity_alerts is
  'Standing searches. Checked when a listing is approved; notified_listing_ids stops the same listing alerting twice.';

comment on table public.reviews is
  'Feedback attached to a completed transaction — one per deal per side. The transaction link is the main defence against invented reviews.';

comment on table public.founder_profiles is
  'Co-founder profiles. The seeking column drives matching: it is matched against other members skills, so complementary pairs rank above similar ones.';

comment on table public.follows is
  'Who follows which member or business, for the network feed.';

comment on table public.posts is
  'The professional feed: updates, milestones and opportunities posted by members.';

comment on table public.reports is
  'Complaints about a listing, member or message, for moderators to act on.';

comment on table public.notifications is
  'In-app notifications. Written by the server on offers, messages, moderation decisions, alert matches and price drops.';

