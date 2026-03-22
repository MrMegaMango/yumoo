-- ─── Referral codes ───────────────────────────────────────────────────────────

-- One row per user; created lazily on first request for a referral link.
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.referral_codes enable row level security;

create policy "Users can read own referral code"
on public.referral_codes
for select to authenticated
using (auth.uid() = user_id);

-- ─── Referral redemptions ─────────────────────────────────────────────────────

-- One row per new account; prevents the same new user triggering a reward twice.
create table if not exists public.referral_redemptions (
  new_user_id      uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  created_at       timestamptz not null default timezone('utc', now())
);

alter table public.referral_redemptions enable row level security;

-- ─── get_or_create_referral_code ─────────────────────────────────────────────

-- Returns the caller's referral code, creating one if it does not exist yet.
create or replace function public.get_or_create_referral_code(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_code text;
  new_code      text;
begin
  if auth.uid() is null or auth.uid() != target_user_id then
    raise exception 'Unauthorized' using errcode = 'insufficient_privilege';
  end if;

  select code into existing_code
  from referral_codes
  where user_id = target_user_id;

  if existing_code is not null then
    return existing_code;
  end if;

  -- Retry loop handles the rare code collision
  loop
    new_code := substring(encode(gen_random_bytes(6), 'hex') from 1 for 8);
    begin
      insert into referral_codes (user_id, code) values (target_user_id, new_code);
      return new_code;
    exception when unique_violation then
      -- collision, retry
    end;
  end loop;
end;
$$;

revoke all on function public.get_or_create_referral_code(uuid) from public, anon;
grant execute on function public.get_or_create_referral_code(uuid) to authenticated;

-- ─── redeem_referral_code ─────────────────────────────────────────────────────

-- Awards 10 credits to the referrer when a newly upgraded user redeems a code.
-- Returns true if the reward was granted, false if already redeemed / invalid / self-referral.
create or replace function public.redeem_referral_code(ref_code text, new_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  referrer_id uuid;
begin
  if auth.uid() is null or auth.uid() != new_user_id then
    raise exception 'Unauthorized' using errcode = 'insufficient_privilege';
  end if;

  select user_id into referrer_id
  from referral_codes
  where code = ref_code;

  -- Invalid code or self-referral
  if referrer_id is null or referrer_id = new_user_id then
    return false;
  end if;

  -- Record redemption; silently return false if already redeemed
  begin
    insert into referral_redemptions (new_user_id, referrer_user_id)
    values (new_user_id, referrer_id);
  exception when unique_violation then
    return false;
  end;

  -- Add 10 credits to referrer
  insert into user_credits (user_id, credits_remaining)
  values (referrer_id, 10)
  on conflict (user_id) do update
  set credits_remaining = user_credits.credits_remaining + 10,
      updated_at        = timezone('utc', now());

  return true;
end;
$$;

revoke all on function public.redeem_referral_code(text, uuid) from public, anon;
grant execute on function public.redeem_referral_code(text, uuid) to authenticated;

-- ─── add_user_credits ─────────────────────────────────────────────────────────

-- Adds credits to a user. Called server-side by the Stripe webhook; restricted
-- to the service role so it cannot be invoked by clients.
create or replace function public.add_user_credits(target_user_id uuid, amount integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_credits (user_id, credits_remaining)
  values (target_user_id, amount)
  on conflict (user_id) do update
  set credits_remaining = user_credits.credits_remaining + amount,
      updated_at        = timezone('utc', now());
end;
$$;

revoke all on function public.add_user_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_user_credits(uuid, integer) to service_role;
