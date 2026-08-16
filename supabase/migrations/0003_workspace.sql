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
