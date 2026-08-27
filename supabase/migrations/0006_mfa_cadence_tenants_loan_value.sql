-- Batch 2 follow-up jobs. Run once in the Supabase SQL Editor. Safe to re-run.

-- 1. MFA cadence tracking (both roles) -- updated by the client on every
-- successful enroll/challenge verify; RequireRole compares it against the
-- session's own last_sign_in_at (and, for admins, a 30-day window) to decide
-- whether a fresh code is required.
alter table investor_users add column if not exists last_mfa_verified_at timestamptz;

-- 2. Loan Value -- LVR itself (Loan Value / Latest Valuation) is computed
-- client-side, same pattern as the other derived percentages, so it isn't
-- stored here.
alter table properties add column if not exists loan_value numeric(14, 2);

-- 3. Tenants
create table if not exists property_tenants (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  lease_term text,
  lease_expiry date,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists property_tenants_property_idx on property_tenants(property_id);

drop trigger if exists set_updated_at on property_tenants;
create trigger set_updated_at before update on property_tenants
  for each row execute function set_updated_at();

drop trigger if exists audit_property_tenants on property_tenants;
create trigger audit_property_tenants after insert or update or delete on property_tenants
  for each row execute function audit_trigger();

alter table property_tenants enable row level security;

drop policy if exists property_tenants_select on property_tenants;
create policy property_tenants_select on property_tenants for select using (
  is_admin_verified() or
  property_id in (select property_id from investor_properties where investor_account_id = auth_investor_account_id())
);
create policy property_tenants_admin_insert on property_tenants for insert with check (is_admin_verified());
create policy property_tenants_admin_update on property_tenants for update using (is_admin_verified()) with check (is_admin_verified());
create policy property_tenants_admin_delete on property_tenants for delete using (is_admin_verified());

-- 4. Investor MFA is now mandatory too (previously admin-only). This mirrors
-- is_admin_verified()'s aal2 requirement inside the one function every
-- investor-scoped policy already funnels through -- so every existing policy
-- (properties, property_photos, investor_properties, documents, notices,
-- investor_accounts, the two storage buckets, and now property_tenants above)
-- picks up the requirement automatically with no other policy edits needed.
-- Investors without a verified session simply see nothing scoped to their
-- account until they complete TOTP enrollment, same as admins today.
create or replace function auth_investor_account_id() returns uuid
language sql stable security definer set search_path = public as $$
  select investor_account_id from investor_users
  where id = auth.uid() and role = 'investor' and is_active
    and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;
