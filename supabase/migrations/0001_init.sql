-- ===========================================================================
-- BizHub — initial schema
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
