-- Preserve shared booking history by allowing self-deletion only for accounts
-- that have never participated in a booking. Stage deletion by suspending the
-- account before external Storage cleanup so no new uploads/bookings can race it.
create or replace function public.begin_my_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Authentication is required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text, 0));
  if exists (
    select 1 from public.coach_bookings booking
    where account_id in (booking.coach_user_id, booking.athlete_user_id)
  ) then
    raise exception 'Booking history must be retained';
  end if;
  update public.profiles
  set account_status = 'SUSPENDED',
      account_suspension_reason = 'Account deletion in progress',
      account_suspended_at = clock_timestamp(),
      account_suspended_by = account_id
  where id = account_id and account_status = 'ACTIVE';
  if not found then raise exception 'Account cannot be deleted'; end if;
  return true;
end;
$$;

create or replace function public.cancel_my_account_deletion()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare account_id uuid := (select auth.uid());
begin
  if account_id is null then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text, 0));
  update public.profiles
  set account_status = 'ACTIVE', account_suspension_reason = null,
      account_suspended_at = null, account_suspended_by = null
  where id = account_id and account_status = 'SUSPENDED'
    and account_suspension_reason = 'Account deletion in progress';
  return found;
end;
$$;

create or replace function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare account_id uuid := (select auth.uid());
begin
  if account_id is null then raise exception 'Authentication is required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account_id::text, 0));
  if exists (
    select 1 from public.coach_bookings booking
    where account_id in (booking.coach_user_id, booking.athlete_user_id)
  ) then raise exception 'Booking history must be retained'; end if;
  if not exists (
    select 1 from public.profiles profile where profile.id = account_id
      and profile.account_status = 'SUSPENDED'
      and profile.account_suspension_reason = 'Account deletion in progress'
  ) then raise exception 'Account deletion was not prepared'; end if;
  delete from auth.users where id = account_id;
  if not found then raise exception 'Account was not found'; end if;
  return true;
end;
$$;

revoke all on function public.begin_my_account_deletion() from public, anon;
revoke all on function public.cancel_my_account_deletion() from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.begin_my_account_deletion() to authenticated;
grant execute on function public.cancel_my_account_deletion() to authenticated;
grant execute on function public.delete_my_account() to authenticated;
