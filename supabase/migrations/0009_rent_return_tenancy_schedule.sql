-- Run once in the Supabase SQL Editor. Safe to re-run.

-- 1. Per-property rent and return, entered by an admin on the property.
alter table properties add column if not exists total_rent numeric(14, 2);
alter table properties add column if not exists return_pct numeric(6, 3);

-- 2. Tenancy schedule: one per property, replaced on re-upload. The uploaded
-- Excel file is parsed in the browser and only its displayed cell text is
-- stored (header labels in `columns`, body rows in `rows`).
create table if not exists property_tenancy_schedules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references properties(id) on delete cascade,
  as_at date not null,
  file_name text,
  columns jsonb not null default '[]'::jsonb,
  rows jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at on property_tenancy_schedules;
create trigger set_updated_at before update on property_tenancy_schedules
  for each row execute function set_updated_at();

drop trigger if exists audit_property_tenancy_schedules on property_tenancy_schedules;
create trigger audit_property_tenancy_schedules after insert or update or delete on property_tenancy_schedules
  for each row execute function audit_trigger();

alter table property_tenancy_schedules enable row level security;

drop policy if exists property_tenancy_schedules_select on property_tenancy_schedules;
create policy property_tenancy_schedules_select on property_tenancy_schedules for select using (
  is_admin_verified() or
  property_id in (select property_id from investor_properties where investor_account_id = auth_investor_account_id())
);
drop policy if exists property_tenancy_schedules_admin_insert on property_tenancy_schedules;
create policy property_tenancy_schedules_admin_insert on property_tenancy_schedules for insert with check (is_admin_verified());
drop policy if exists property_tenancy_schedules_admin_update on property_tenancy_schedules;
create policy property_tenancy_schedules_admin_update on property_tenancy_schedules for update using (is_admin_verified()) with check (is_admin_verified());
drop policy if exists property_tenancy_schedules_admin_delete on property_tenancy_schedules;
create policy property_tenancy_schedules_admin_delete on property_tenancy_schedules for delete using (is_admin_verified());

-- From 30 Oct 2026 Supabase no longer auto-grants Data API access on new
-- public tables, so grant it here. RLS above still decides which rows each
-- role can touch.
grant select, insert, update, delete on property_tenancy_schedules to authenticated;
grant all on property_tenancy_schedules to service_role;
