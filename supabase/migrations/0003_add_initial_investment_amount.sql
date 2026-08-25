-- Adds a property-level "initial investment amount" (what Brixton originally
-- paid to acquire the property), shown alongside Latest Valuation. This is
-- distinct from investor_properties.invested_amount, which is how much a
-- specific investor put into their stake in the property.
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table properties add column if not exists initial_investment_amount numeric(14, 2);
