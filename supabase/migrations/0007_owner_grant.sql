-- Owner privileges, and who holds them.
--
-- An owner can do everything an admin can. Rather than teach every policy
-- about a second role, is_admin() — which all of them already go through —
-- answers for both. is_owner() exists for the few things that should stay with
-- the owner alone.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'owner')
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'owner'
  );
$$;

-- The founding account. Named here because there is no other way to hand out
-- the first owner role: every route that could grant it is itself behind a
-- privilege check, so the first one has to come from a migration. A project
-- that does not have this account is unaffected — the update matches nothing.
update public.profiles
   set role = 'owner'
 where id = '0c213896-9665-44d7-8932-803ec34da95d';
