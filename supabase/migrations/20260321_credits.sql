-- Rename guest_diaries to diaries (serves both anonymous guests and real users)
alter table public.guest_diaries rename to diaries;

-- Re-create the updated_at trigger under a cleaner name
drop trigger if exists set_guest_diaries_updated_at on public.diaries;

create trigger set_diaries_updated_at
before update on public.diaries
for each row execute function public.set_updated_at();

-- Re-create RLS policies under cleaner names
drop policy if exists "Users can read their own guest diary" on public.diaries;
drop policy if exists "Users can insert their own guest diary" on public.diaries;
drop policy if exists "Users can update their own guest diary" on public.diaries;
drop policy if exists "Users can delete their own guest diary" on public.diaries;

create policy "Users can read their own diary"
on public.diaries
for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own diary"
on public.diaries
for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own diary"
on public.diaries
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own diary"
on public.diaries
for delete to authenticated
using ((select auth.uid()) = user_id);

-- Update cleanup function to reference the renamed diaries table
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
    left join public.diaries as diaries
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

-- ─── Credits ──────────────────────────────────────────────────────────────────

-- One row per user; row is created lazily on first art generation.
-- Both anonymous visitors and signed-in users share this table.
create table if not exists public.user_credits (
  user_id          uuid    primary key references auth.users(id) on delete cascade,
  credits_remaining integer not null default 10 check (credits_remaining >= 0),
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now())
);

alter table public.user_credits enable row level security;

create trigger set_user_credits_updated_at
before update on public.user_credits
for each row execute function public.set_updated_at();

-- Users can read their own balance (browser client uses this)
create policy "Users can read own credits"
on public.user_credits
for select to authenticated
using (auth.uid() = user_id);

-- Atomically deduct one art credit for the calling user.
-- Creates the row with 10 credits on first call.
-- Returns credits_remaining after deduction, or -1 if the balance is already 0.
create or replace function public.consume_art_credit(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  -- Verify the caller is the user they claim to be
  if auth.uid() is null or auth.uid() != target_user_id then
    raise exception 'Unauthorized' using errcode = 'insufficient_privilege';
  end if;

  -- Insert the row with the starting balance if it does not exist yet
  insert into public.user_credits (user_id, credits_remaining)
  values (target_user_id, 10)
  on conflict (user_id) do nothing;

  -- Deduct one credit only when the balance is positive
  update public.user_credits
  set    credits_remaining = credits_remaining - 1,
         updated_at        = timezone('utc', now())
  where  user_id           = target_user_id
    and  credits_remaining > 0
  returning credits_remaining into remaining;

  -- remaining is NULL when no row was updated (balance was already 0)
  return coalesce(remaining, -1);
end;
$$;

-- Only authenticated users (anonymous or real) can call this function
revoke all on function public.consume_art_credit(uuid) from public, anon;
grant execute on function public.consume_art_credit(uuid) to authenticated;
