-- ============================================
-- Migration 004: business_day on cash_registers
-- Apply in the Supabase SQL Editor AFTER migration 003.
-- ============================================

-- 1) Add business_day as the canonical work-day for a register.
--    A register belongs to exactly one business day, and only one
--    register (open or closed) can exist for any given day.
--    Existing rows are backfilled from opened_at; if there are duplicates
--    the unique index creation below will fail and you'll need to clean
--    up the data manually before re-running.
alter table cash_registers
  add column if not exists business_day date;

update cash_registers
  set business_day = (opened_at at time zone 'America/Argentina/Buenos_Aires')::date
  where business_day is null;

alter table cash_registers
  alter column business_day set not null;

create unique index if not exists idx_cash_registers_business_day
  on cash_registers(business_day);
