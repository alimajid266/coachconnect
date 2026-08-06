create function public.delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
begin
  if account_id is null then
    raise exception 'Authentication is required';
  end if;

  delete from auth.users
  where id = account_id;

  if not found then
    raise exception 'Account was not found';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
