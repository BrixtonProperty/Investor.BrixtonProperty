-- Brixton Property Investor Portal — initial schema, RLS, triggers, storage buckets.
-- Run ONCE in the Supabase SQL Editor (Dashboard → SQL Editor → New query → paste → Run).
-- Idempotent-ish: safe to re-run if it fails partway, since every object uses
-- `if not exists` / `create or replace` / `drop ... if exists` where practical.
-- No seed/placeholder business data is inserted anywhere in this file
-- (only the single fixed site_settings config row, which is app config, not business data).

create extension if not exists pgcrypto;

-- =========================================================================
-- 1. TABLES
-- =========================================================================

create table if not exists investor_accounts (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists investor_users (
  id uuid primary key references auth.users(id) on delete cascade,
  investor_account_id uuid references investor_accounts(id) on delete restrict,
  name text not null,
  email text not null unique,
  phone text,
  address_line1 text,
  address_line2 text,
  suburb_city text,
  region text,
  postcode text,
  country text not null default 'New Zealand',
  role text not null check (role in ('admin', 'investor')),
  is_active boolean not null default true,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted')),
  invite_link text,
  invite_generated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investor_requires_account check (role <> 'investor' or investor_account_id is not null)
);
create index if not exists investor_users_account_idx on investor_users(investor_account_id);

create table if not exists properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text not null,
  description text not null default '',
  total_value numeric(14, 2) not null,   -- "Latest Valuation"
  valuation_date date not null,
  initial_investment_amount numeric(14, 2),   -- what Brixton originally paid to acquire it
  type text not null default '',
  size text,
  occupancy text,
  year_built int,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,
  title text not null default '',
  taken_or_added_date date not null default current_date,
  is_cover boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists property_photos_property_idx on property_photos(property_id);

create table if not exists investor_properties (
  id uuid primary key default gen_random_uuid(),
  investor_account_id uuid not null references investor_accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  ownership_pct numeric(6, 3) not null check (ownership_pct > 0 and ownership_pct <= 100),
  invested_amount numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_account_id, property_id)
);
create index if not exists investor_properties_property_idx on investor_properties(property_id);
create index if not exists investor_properties_account_idx on investor_properties(investor_account_id);

create table if not exists document_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  badge_bg text not null default '#f0f0f0',
  badge_text text not null default '#777777',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  category_id uuid not null references document_categories(id) on delete restrict,
  name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  date_added date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_property_idx on documents(property_id);
create index if not exists documents_category_idx on documents(category_id);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  title text not null,
  description text not null default '',
  notice_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notices_property_idx on notices(property_id);

create table if not exists site_settings (
  id int primary key default 1,
  logo_storage_path text,
  badge_storage_path text,
  company_name text not null default 'Brixton Property Limited',
  company_tagline text not null default 'Building long term value through quality property and trusted partnerships.',
  login_background_storage_path text,
  login_heading text not null default 'Welcome to the Investor Portal',
  login_subtext text not null default 'Access your investments, updates and important documents.',
  login_contact_email text not null default '',
  updated_at timestamptz not null default now(),
  check (id = 1)
);
insert into site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_table_record_idx on audit_log(table_name, record_id);

-- =========================================================================
-- 2. updated_at maintenance
-- =========================================================================

create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array['investor_accounts','investor_users','properties','investor_properties','documents','notices','site_settings'] loop
    execute format('drop trigger if exists set_updated_at on %I', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at()', t);
  end loop;
end $$;

-- =========================================================================
-- 3. Derived value view (Latest Valuation × ownership, always live)
-- =========================================================================

create or replace view investor_holdings
with (security_invoker = true) as
select
  ip.id as investor_property_id,
  ip.investor_account_id,
  ip.property_id,
  ip.ownership_pct,
  ip.invested_amount,
  p.total_value,
  p.valuation_date,
  round(p.total_value * ip.ownership_pct / 100.0, 2) as current_asset_value
from investor_properties ip
join properties p on p.id = ip.property_id;

-- =========================================================================
-- 4. RLS helper functions
-- =========================================================================

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'admin' and is_active from investor_users where id = auth.uid()), false);
$$;

-- Admin AND this session has completed MFA (aal2). Mandatory MFA per brief:
-- an admin without a verified session can reach nothing admin-scoped.
create or replace function is_admin_verified() returns boolean
language sql stable security definer set search_path = public as $$
  select is_admin() and coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

create or replace function auth_investor_account_id() returns uuid
language sql stable security definer set search_path = public as $$
  select investor_account_id from investor_users
  where id = auth.uid() and role = 'investor' and is_active;
$$;

-- =========================================================================
-- 5. Audit log trigger
-- =========================================================================

create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into audit_log(actor_id, action, table_name, record_id, old_data, new_data)
  values (
    auth.uid(), TG_OP, TG_TABLE_NAME,
    (case when TG_OP = 'DELETE' then old.id else new.id end)::text,
    case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when TG_OP in ('UPDATE', 'INSERT') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end; $$;

do $$
declare t text;
begin
  foreach t in array array['properties','property_photos','investor_accounts','investor_users',
                            'investor_properties','documents','document_categories','notices','site_settings'] loop
    execute format('drop trigger if exists audit_%1$s on %1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$s for each row execute function audit_trigger()', t);
  end loop;
end $$;

-- =========================================================================
-- 6. investor_users column-guard (RLS can't restrict columns; a trigger can)
-- =========================================================================

create or replace function guard_investor_user_update() returns trigger
language plpgsql as $$
begin
  -- service_role (Netlify Functions, local bootstrap script) is a trusted
  -- server-side caller and bypasses this guard entirely — it has no user
  -- JWT for is_admin_verified() to recognize, but it's the mechanism by
  -- which invite_status/invite_link/is_active are legitimately managed.
  if auth.role() = 'service_role' or is_admin_verified() then
    return new;
  end if;
  -- invite_status is deliberately NOT protected here: the investor's own
  -- (pre-MFA) session must be able to flip pending -> accepted on their own
  -- row when they finish setting a password. It's a low-stakes progress
  -- flag, not an access-control field.
  if new.role is distinct from old.role
     or new.investor_account_id is distinct from old.investor_account_id
     or new.is_active is distinct from old.is_active
     or new.invite_link is distinct from old.invite_link
     or new.email is distinct from old.email then
    raise exception 'not permitted to change protected fields';
  end if;
  return new;
end; $$;

drop trigger if exists guard_investor_users on investor_users;
create trigger guard_investor_users before update on investor_users
  for each row execute function guard_investor_user_update();

-- =========================================================================
-- 7. Enable RLS everywhere — no exceptions
-- =========================================================================

alter table investor_accounts    enable row level security;
alter table investor_users       enable row level security;
alter table properties           enable row level security;
alter table property_photos      enable row level security;
alter table investor_properties  enable row level security;
alter table document_categories  enable row level security;
alter table documents            enable row level security;
alter table notices              enable row level security;
alter table site_settings        enable row level security;
alter table audit_log            enable row level security;

-- =========================================================================
-- 8. Policies
-- =========================================================================

-- investor_accounts
drop policy if exists investor_accounts_select on investor_accounts;
create policy investor_accounts_select on investor_accounts for select using (
  is_admin_verified() or id = auth_investor_account_id()
);
drop policy if exists investor_accounts_admin_write on investor_accounts;
create policy investor_accounts_admin_insert on investor_accounts for insert with check (is_admin_verified());
create policy investor_accounts_admin_update on investor_accounts for update using (is_admin_verified()) with check (is_admin_verified());
create policy investor_accounts_admin_delete on investor_accounts for delete using (is_admin_verified());

-- investor_users (self row + admin; column guard above protects sensitive fields)
drop policy if exists investor_users_select on investor_users;
create policy investor_users_select on investor_users for select using (
  is_admin_verified() or id = auth.uid()
);
create policy investor_users_update on investor_users for update using (
  is_admin_verified() or id = auth.uid()
) with check (
  is_admin_verified() or id = auth.uid()
);
create policy investor_users_admin_insert on investor_users for insert with check (is_admin_verified());
create policy investor_users_admin_delete on investor_users for delete using (is_admin_verified());

-- properties
drop policy if exists properties_select on properties;
create policy properties_select on properties for select using (
  is_admin_verified() or
  id in (select property_id from investor_properties where investor_account_id = auth_investor_account_id())
);
create policy properties_admin_insert on properties for insert with check (is_admin_verified());
create policy properties_admin_update on properties for update using (is_admin_verified()) with check (is_admin_verified());
create policy properties_admin_delete on properties for delete using (is_admin_verified());

-- property_photos
drop policy if exists property_photos_select on property_photos;
create policy property_photos_select on property_photos for select using (
  is_admin_verified() or
  property_id in (select property_id from investor_properties where investor_account_id = auth_investor_account_id())
);
create policy property_photos_admin_insert on property_photos for insert with check (is_admin_verified());
create policy property_photos_admin_update on property_photos for update using (is_admin_verified()) with check (is_admin_verified());
create policy property_photos_admin_delete on property_photos for delete using (is_admin_verified());

-- investor_properties
drop policy if exists investor_properties_select on investor_properties;
create policy investor_properties_select on investor_properties for select using (
  is_admin_verified() or investor_account_id = auth_investor_account_id()
);
create policy investor_properties_admin_insert on investor_properties for insert with check (is_admin_verified());
create policy investor_properties_admin_update on investor_properties for update using (is_admin_verified()) with check (is_admin_verified());
create policy investor_properties_admin_delete on investor_properties for delete using (is_admin_verified());

-- document_categories (both roles need to read for pills/filters; only admin writes)
drop policy if exists document_categories_select on document_categories;
create policy document_categories_select on document_categories for select using (auth.uid() is not null);
create policy document_categories_admin_insert on document_categories for insert with check (is_admin_verified());
create policy document_categories_admin_update on document_categories for update using (is_admin_verified()) with check (is_admin_verified());
create policy document_categories_admin_delete on document_categories for delete using (is_admin_verified());

-- documents
drop policy if exists documents_select on documents;
create policy documents_select on documents for select using (
  is_admin_verified() or
  property_id in (select property_id from investor_properties where investor_account_id = auth_investor_account_id())
);
create policy documents_admin_insert on documents for insert with check (is_admin_verified());
create policy documents_admin_update on documents for update using (is_admin_verified()) with check (is_admin_verified());
create policy documents_admin_delete on documents for delete using (is_admin_verified());

-- notices
drop policy if exists notices_select on notices;
create policy notices_select on notices for select using (
  is_admin_verified() or
  property_id in (select property_id from investor_properties where investor_account_id = auth_investor_account_id())
);
create policy notices_admin_insert on notices for insert with check (is_admin_verified());
create policy notices_admin_update on notices for update using (is_admin_verified()) with check (is_admin_verified());
create policy notices_admin_delete on notices for delete using (is_admin_verified());

-- site_settings (public read incl. anon — login page needs branding pre-session)
drop policy if exists site_settings_select on site_settings;
create policy site_settings_select on site_settings for select using (true);
create policy site_settings_admin_update on site_settings for update using (is_admin_verified()) with check (is_admin_verified());

-- audit_log: no INSERT policy for any role (only the security-definer trigger writes it); immutable.
drop policy if exists audit_log_select on audit_log;
create policy audit_log_select on audit_log for select using (is_admin_verified());

-- =========================================================================
-- 9. Storage buckets
-- =========================================================================

insert into storage.buckets (id, name, public)
values
  ('site-assets', 'site-assets', true),
  ('property-photos', 'property-photos', false),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- storage.objects RLS — path convention: {bucket}/{property_id}/{filename}
drop policy if exists documents_bucket_select on storage.objects;
create policy documents_bucket_select on storage.objects for select using (
  bucket_id = 'documents' and (
    is_admin_verified() or
    (storage.foldername(name))[1]::uuid in (
      select property_id from investor_properties where investor_account_id = auth_investor_account_id())
  )
);
create policy documents_bucket_admin_insert on storage.objects for insert with check (bucket_id = 'documents' and is_admin_verified());
create policy documents_bucket_admin_update on storage.objects for update using (bucket_id = 'documents' and is_admin_verified());
create policy documents_bucket_admin_delete on storage.objects for delete using (bucket_id = 'documents' and is_admin_verified());

drop policy if exists photos_bucket_select on storage.objects;
create policy photos_bucket_select on storage.objects for select using (
  bucket_id = 'property-photos' and (
    is_admin_verified() or
    (storage.foldername(name))[1]::uuid in (
      select property_id from investor_properties where investor_account_id = auth_investor_account_id())
  )
);
create policy photos_bucket_admin_insert on storage.objects for insert with check (bucket_id = 'property-photos' and is_admin_verified());
create policy photos_bucket_admin_update on storage.objects for update using (bucket_id = 'property-photos' and is_admin_verified());
create policy photos_bucket_admin_delete on storage.objects for delete using (bucket_id = 'property-photos' and is_admin_verified());

-- site-assets bucket is public for anonymous/unauthenticated fetches (the
-- login page needs branding pre-session), but authenticated calls -- like
-- the upload/upsert used when replacing branding images -- still go through
-- RLS and need their own SELECT policy regardless of the bucket's public flag.
drop policy if exists site_assets_bucket_select on storage.objects;
create policy site_assets_bucket_select on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists site_assets_bucket_admin_insert on storage.objects;
create policy site_assets_bucket_admin_insert on storage.objects for insert with check (bucket_id = 'site-assets' and is_admin_verified());
create policy site_assets_bucket_admin_update on storage.objects for update using (bucket_id = 'site-assets' and is_admin_verified());
create policy site_assets_bucket_admin_delete on storage.objects for delete using (bucket_id = 'site-assets' and is_admin_verified());

-- =========================================================================
-- Done. Next: Authentication → Settings in the Supabase Dashboard —
-- disable public sign-ups, add /accept-invite to the redirect allowlist,
-- and enable TOTP as an MFA factor type. See README.md for the full checklist.
-- =========================================================================
