-- "Total Equity Invested" -- a new property-level field, distinct from
-- investor_properties.invested_amount (now labelled "Initial Investment" in
-- the UI, per-investor per-property). This one lives on the property itself:
-- total equity invested into the property at time of purchase.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table properties add column if not exists total_equity_invested numeric(14, 2);

-- Dashboard hero banner photo -- a general site image (like the login
-- background/logo), not tied to any specific property, so it lives on
-- site_settings rather than properties.
alter table site_settings add column if not exists dashboard_hero_storage_path text;
