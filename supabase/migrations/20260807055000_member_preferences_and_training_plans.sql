alter table public.profiles
  add column interests text[] not null default '{}',
  add column preferred_location text,
  add column max_budget_pkr integer check (max_budget_pkr is null or max_budget_pkr between 500 and 1000000),
  add column training_goal text check (training_goal is null or char_length(training_goal) between 2 and 240),
  add column experience_level text check (experience_level is null or experience_level in ('Beginner', 'Intermediate', 'Advanced'));

grant update (interests, preferred_location, max_budget_pkr, training_goal, experience_level) on public.profiles to authenticated;

create or replace function public.handle_new_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;

  requested_interests text[];
  requested_budget integer;
begin
  requested_name := left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Member'), 60);
  if char_length(requested_name) < 2 then requested_name := 'Member'; end if;


  select coalesce(array_agg(left(value, 40)) filter (where char_length(trim(value)) between 2 and 40), '{}')
  into requested_interests
  from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'interests', '[]'::jsonb)) value;

  begin requested_budget := (new.raw_user_meta_data ->> 'max_budget_pkr')::integer;
  exception when others then requested_budget := null;
  end;
  if requested_budget is not null and requested_budget not between 500 and 1000000 then requested_budget := null; end if;

  insert into public.profiles (id, display_name, role, interests, preferred_location, max_budget_pkr, training_goal, experience_level)
  values (
    new.id,
    requested_name,
    'ATHLETE',
    requested_interests,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'preferred_location', '')), 80), ''),
    requested_budget,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'training_goal', '')), 240), ''),
    case when new.raw_user_meta_data ->> 'experience_level' in ('Beginner', 'Intermediate', 'Advanced') then new.raw_user_meta_data ->> 'experience_level' else 'Beginner' end
  );
  return new;
end;
$$;

create table public.ai_training_plan_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default timezone('utc', now())
);
alter table public.ai_training_plan_requests enable row level security;
revoke all on table public.ai_training_plan_requests from anon, authenticated;

create or replace function public.consume_ai_training_plan_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare actor uuid := (select auth.uid());
begin
  if actor is null then return false; end if;
  delete from public.ai_training_plan_requests where requested_at < timezone('utc', now()) - interval '24 hours';
  if (select count(*) from public.ai_training_plan_requests where user_id = actor and requested_at >= timezone('utc', now()) - interval '1 hour') >= 5 then return false; end if;
  insert into public.ai_training_plan_requests (user_id) values (actor);
  return true;
end;
$$;
revoke all on function public.consume_ai_training_plan_quota() from public, anon;
grant execute on function public.consume_ai_training_plan_quota() to authenticated;

create table public.training_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (char_length(sport) between 2 and 40),
  goal text not null check (char_length(goal) between 2 and 240),
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  sessions_per_week integer not null check (sessions_per_week between 1 and 7),
  plan jsonb not null check (jsonb_typeof(plan) = 'object'),
  generated_by text not null check (char_length(generated_by) between 2 and 80),
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.training_plans enable row level security;
grant select, insert, delete on public.training_plans to authenticated;
create policy "Members manage their own training plans" on public.training_plans for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index training_plans_user_created_idx on public.training_plans (user_id, created_at desc);
