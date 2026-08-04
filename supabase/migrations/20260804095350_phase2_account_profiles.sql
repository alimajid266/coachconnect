create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  role text not null default 'ATHLETE' check (role in ('ATHLETE', 'COACH', 'ADMIN')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is
  'Private account metadata. Public coach information belongs in a separately approved table.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;

create policy "Users can read their own account profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own allowed profile fields"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_profile_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_profile_updated_at();

create function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
  requested_role text;
begin
  requested_name := left(
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Member'),
    60
  );

  if char_length(requested_name) < 2 then
    requested_name := 'Member';
  end if;

  requested_role := upper(coalesce(new.raw_user_meta_data ->> 'role', 'ATHLETE'));

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    requested_name,
    case when requested_role = 'COACH' then 'COACH' else 'ATHLETE' end
  );

  return new;
end;
$$;

create trigger create_profile_after_signup
after insert on auth.users
for each row execute procedure public.handle_new_account();
