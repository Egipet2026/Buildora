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
