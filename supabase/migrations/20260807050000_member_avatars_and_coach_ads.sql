alter table public.profiles
  add column if not exists avatar_path text;

alter table public.profiles
  drop constraint if exists profiles_valid_avatar_path,
  add constraint profiles_valid_avatar_path check (
    avatar_path is null
    or (
      char_length(avatar_path) between 40 and 240
      and avatar_path !~ '(^|/)\.\.?(/|$)'
      and avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
      and split_part(avatar_path, '/', 1) = id::text
    )
  );

grant update (avatar_path) on public.profiles to authenticated;

create or replace function public.is_valid_member_media_paths(owner_id uuid, paths text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(cardinality(paths), 0) <= 5
    and not exists (
      select 1
      from unnest(coalesce(paths, '{}'::text[])) as media(path)
      where char_length(media.path) not between 40 and 240
        or media.path ~ '(^|/)\.\.?(/|$)'
        or media.path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
        or split_part(media.path, '/', 1) <> owner_id::text
    );
$$;

revoke all on function public.is_valid_member_media_paths(uuid, text[]) from public;
grant execute on function public.is_valid_member_media_paths(uuid, text[]) to authenticated, service_role;

alter table public.coach_applications
  add column if not exists ad_image_paths text[] not null default '{}';

alter table public.coach_applications
  drop constraint if exists coach_applications_valid_ad_image_paths,
  add constraint coach_applications_valid_ad_image_paths check (
    cardinality(ad_image_paths) <= 5
    and public.is_valid_member_media_paths(user_id, ad_image_paths)
  );

grant insert (ad_image_paths) on public.coach_applications to authenticated;
grant update (ad_image_paths) on public.coach_applications to authenticated;

create or replace function public.attach_coach_ad_image(image_path text)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  current_paths text[];
begin
  if member_id is null
    or not public.is_valid_member_media_paths(member_id, array[image_path]) then
    raise exception 'Invalid coach ad image';
  end if;

  select application.ad_image_paths
    into current_paths
  from public.coach_applications application
  join public.profiles profile on profile.id = application.user_id
  where application.user_id = member_id
    and application.status in ('DRAFT', 'REJECTED', 'APPROVED')
    and profile.account_status = 'ACTIVE'
  for update of application;

  if current_paths is null then
    raise exception 'Editable coach application required';
  end if;
  if image_path = any(current_paths) then
    return current_paths;
  end if;
  if cardinality(current_paths) >= 5 then
    raise exception 'Coach ad image limit reached';
  end if;

  current_paths := array_append(current_paths, image_path);
  update public.coach_applications
  set ad_image_paths = current_paths, updated_at = now()
  where user_id = member_id;
  return current_paths;
end;
$$;

revoke all on function public.attach_coach_ad_image(text) from public, anon;
grant execute on function public.attach_coach_ad_image(text) to authenticated;

create or replace function public.is_approved_coach_profile_image(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coach_applications application
    join public.profiles profile on profile.id = application.user_id
    where application.status = 'APPROVED'
      and profile.account_status = 'ACTIVE'
      and (
        application.profile_image_path = object_name
        or object_name = any(application.ad_image_paths)
        or profile.avatar_path = object_name
      )
  );
$$;

revoke all on function public.is_approved_coach_profile_image(text) from public;
grant execute on function public.is_approved_coach_profile_image(text) to anon, authenticated;

alter table public.coach_profile_image_upload_limits
  add column if not exists window_started_at timestamptz not null default clock_timestamp();

create or replace function public.reserve_coach_profile_image_upload(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  reserved boolean;
begin
  insert into public.coach_profile_image_upload_limits as upload_limit (
    user_id, upload_count, last_upload_at, window_started_at
  ) values (
    target_user_id, 1, clock_timestamp(), clock_timestamp()
  )
  on conflict (user_id) do update set
    upload_count = case
      when upload_limit.window_started_at <= clock_timestamp() - interval '24 hours' then 1
      else upload_limit.upload_count + 1
    end,
    last_upload_at = clock_timestamp(),
    window_started_at = case
      when upload_limit.window_started_at <= clock_timestamp() - interval '24 hours' then clock_timestamp()
      else upload_limit.window_started_at
    end
  where upload_limit.window_started_at <= clock_timestamp() - interval '24 hours'
     or upload_limit.upload_count < 20
  returning true into reserved;
  return coalesce(reserved, false);
end;
$$;

revoke all on function public.reserve_coach_profile_image_upload(uuid) from public, anon, authenticated;
grant execute on function public.reserve_coach_profile_image_upload(uuid) to service_role;

drop function if exists public.get_public_coach(uuid);
drop function if exists public.list_public_coaches();

create function public.list_public_coaches()
returns table (
  user_id uuid, display_name text, headline text, bio text, sports text[], tags text[],
  experience_years integer, qualifications text, audiences text[], levels text[], lesson_plan text,
  session_price_pkr integer, offers_online boolean, offers_in_person boolean, city text, public_area text,
  public_longitude double precision, public_latitude double precision, profile_image_path text,
  ad_image_paths text[], avatar_path text, availability jsonb, faqs jsonb, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    application.user_id, application.public_name, application.headline, application.bio,
    application.sports, application.tags, application.experience_years, application.qualifications,
    application.audiences, application.levels, application.lesson_plan, application.session_price_pkr,
    application.offers_online, application.offers_in_person, application.city, application.public_area,
    application.public_longitude, application.public_latitude, application.profile_image_path,
    application.ad_image_paths, profile.avatar_path, application.availability,
    coalesce((
      select jsonb_agg(jsonb_build_object('question', faq ->> 'question', 'answer', faq ->> 'answer'))
      from jsonb_array_elements(application.faqs) as faq
    ), '[]'::jsonb),
    application.updated_at
  from public.coach_applications as application
  join public.profiles as profile on profile.id = application.user_id
  where application.status = 'APPROVED'
    and profile.account_status = 'ACTIVE'
    and application.public_name is not null
  order by application.updated_at desc, application.user_id;
$$;

create function public.get_public_coach(target_user_id uuid)
returns table (
  user_id uuid, display_name text, headline text, bio text, sports text[], tags text[],
  experience_years integer, qualifications text, audiences text[], levels text[], lesson_plan text,
  session_price_pkr integer, offers_online boolean, offers_in_person boolean, city text, public_area text,
  public_longitude double precision, public_latitude double precision, profile_image_path text,
  ad_image_paths text[], avatar_path text, availability jsonb, faqs jsonb, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.list_public_coaches() as coach where coach.user_id = target_user_id;
$$;

revoke all on function public.list_public_coaches() from public;
revoke all on function public.get_public_coach(uuid) from public;
grant execute on function public.list_public_coaches() to anon, authenticated;
grant execute on function public.get_public_coach(uuid) to anon, authenticated;
