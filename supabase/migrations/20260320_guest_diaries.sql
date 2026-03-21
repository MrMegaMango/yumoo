create table if not exists public.guest_diaries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  store jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.guest_diaries enable row level security;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_guest_diaries_updated_at on public.guest_diaries;

create trigger set_guest_diaries_updated_at
before update on public.guest_diaries
for each row
execute function public.set_updated_at();

drop policy if exists "Users can read their own guest diary" on public.guest_diaries;
create policy "Users can read their own guest diary"
on public.guest_diaries
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can insert their own guest diary" on public.guest_diaries;
create policy "Users can insert their own guest diary"
on public.guest_diaries
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can update their own guest diary" on public.guest_diaries;
create policy "Users can update their own guest diary"
on public.guest_diaries
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

drop policy if exists "Users can delete their own guest diary" on public.guest_diaries;
create policy "Users can delete their own guest diary"
on public.guest_diaries
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
