create extension if not exists pg_cron with schema extensions;

create or replace function public.cleanup_stale_anonymous_users(
  retention interval default interval '45 days'
)
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_count integer;
begin
  with stale_users as (
    select users.id
    from auth.users as users
    left join public.guest_diaries as diaries
      on diaries.user_id = users.id
    where users.is_anonymous is true
      and coalesce(diaries.updated_at, users.last_sign_in_at, users.created_at) < now() - retention
  ),
  deleted as (
    delete from auth.users as users
    using stale_users
    where users.id = stale_users.id
    returning 1
  )
  select count(*)
  into deleted_count
  from deleted;

  return coalesce(deleted_count, 0);
end;
$$;

revoke all
on function public.cleanup_stale_anonymous_users(interval)
from public, anon, authenticated;

select cron.schedule(
  'cleanup-stale-anonymous-users',
  '17 3 * * *',
  $$select public.cleanup_stale_anonymous_users(interval '45 days');$$
);
