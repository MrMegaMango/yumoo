-- Admin-friendly views that join app tables with auth.users to show emails.
-- These are SECURITY DEFINER views owned by postgres so they can read auth.users;
-- they are NOT exposed via the API (no RLS, no grant to anon/authenticated).

create or replace view public.user_credits_with_email as
select
  uc.user_id,
  u.email,
  u.is_anonymous,
  uc.credits_remaining,
  uc.created_at,
  uc.updated_at
from public.user_credits uc
join auth.users u on u.id = uc.user_id
order by uc.updated_at desc;

-- Revoke API access so this is dashboard-only
revoke all on public.user_credits_with_email from anon, authenticated;
