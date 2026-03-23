-- Add lifetime_access flag to user_credits
alter table public.user_credits
  add column if not exists lifetime_access boolean not null default false;

-- Update consume_art_credit to skip deduction and return -2 for lifetime users
create or replace function public.consume_art_credit(target_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  is_lifetime boolean;
  remaining   integer;
begin
  -- Verify the caller is the user they claim to be
  if auth.uid() is null or auth.uid() != target_user_id then
    raise exception 'Unauthorized' using errcode = 'insufficient_privilege';
  end if;

  -- Insert the row with the starting balance if it does not exist yet
  insert into public.user_credits (user_id, credits_remaining)
  values (target_user_id, 10)
  on conflict (user_id) do nothing;

  -- Check lifetime status first
  select lifetime_access
  into   is_lifetime
  from   public.user_credits
  where  user_id = target_user_id;

  -- Lifetime users: no deduction, sentinel -2
  if is_lifetime then
    return -2;
  end if;

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

-- Grant lifetime access (called by webhook via service role, bypasses RLS)
create or replace function public.grant_lifetime_access(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_credits (user_id, credits_remaining, lifetime_access)
  values (target_user_id, 0, true)
  on conflict (user_id) do update set lifetime_access = true,
                                      updated_at      = timezone('utc', now());
end;
$$;

-- Only the service role (webhook) may call grant_lifetime_access
revoke all on function public.grant_lifetime_access(uuid) from public, anon, authenticated;
