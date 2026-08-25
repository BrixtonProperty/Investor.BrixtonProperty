-- Fixes a bug in guard_investor_user_update() (from 0001_init.sql): it blocked
-- ALL updates to invite_status/invite_link/is_active/role when there was no
-- MFA-verified admin session — including from service_role itself (Netlify
-- Functions, the bootstrap script), which has no user JWT for
-- is_admin_verified() to recognize as trusted. It also blocked an investor's
-- own (pre-MFA) session from flipping their own invite_status from pending
-- to accepted after setting a password.
--
-- Run this once in the Supabase SQL Editor. Safe to re-run.

create or replace function guard_investor_user_update() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'service_role' or is_admin_verified() then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.investor_account_id is distinct from old.investor_account_id
     or new.is_active is distinct from old.is_active
     or new.invite_link is distinct from old.invite_link
     or new.email is distinct from old.email then
    raise exception 'not permitted to change protected fields';
  end if;
  return new;
end; $$;
