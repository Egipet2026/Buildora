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
