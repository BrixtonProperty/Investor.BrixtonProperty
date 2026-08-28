-- Batch 3 follow-up jobs. Run once in the Supabase SQL Editor. Safe to re-run.

-- 1. Ownership % is now fully derived (Initial Investment ÷ Total Equity
-- Invested), never stored or manually entered. Dropping the column (rather
-- than just no longer writing to it) is deliberate -- keeping it around
-- would let it silently drift from the formula it's now supposed to equal.
-- The view must be redefined FIRST -- it currently reads the old column
-- directly, so Postgres refuses to drop it out from under an active view.
create or replace view investor_holdings
with (security_invoker = true) as
select
  ip.id as investor_property_id,
  ip.investor_account_id,
  ip.property_id,
  case when p.total_equity_invested > 0
    then round(ip.invested_amount / p.total_equity_invested * 100, 3)
    else null
  end::numeric(6, 3) as ownership_pct,
  ip.invested_amount,
  p.total_value,
  p.valuation_date,
  case when p.total_equity_invested > 0
    then round(p.total_value * ip.invested_amount / p.total_equity_invested, 2)
    else null
  end as current_asset_value
from investor_properties ip
join properties p on p.id = ip.property_id;

alter table investor_properties drop column if exists ownership_pct;

-- 4. Right of Renewal, alongside the other tenant fields.
alter table property_tenants add column if not exists right_of_renewal text;
