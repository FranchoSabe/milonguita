-- ============================================
-- Migration 006: shift on cash_registers
-- Apply in the Supabase SQL Editor AFTER migration 005.
-- Turns "one register per business_day" into
-- "one register per (business_day, shift)" with
-- shift in ('mediodia', 'noche').
-- ============================================

-- 1) Add shift column (nullable first, so we can backfill).
alter table cash_registers
  add column if not exists shift text;

-- 2) Backfill existing rows using opened_at hour (ART).
--    <= 15:59 local time -> mediodia, otherwise -> noche.
update cash_registers
  set shift = case
    when extract(
      hour from (opened_at at time zone 'America/Argentina/Buenos_Aires')
    ) < 16 then 'mediodia'
    else 'noche'
  end
  where shift is null;

-- 3) Lock it down: NOT NULL + enum check.
alter table cash_registers
  alter column shift set not null;

alter table cash_registers
  drop constraint if exists cash_registers_shift_check;

alter table cash_registers
  add constraint cash_registers_shift_check
    check (shift in ('mediodia', 'noche'));

-- 4) Replace the old unique-per-day index with a per-(day, shift) one.
--    If the previous index name does not exist (fresh DB) the drop is a
--    no-op.
drop index if exists idx_cash_registers_business_day;

create unique index if not exists idx_cash_registers_business_day_shift
  on cash_registers(business_day, shift);

-- 5) Enforce "at most one open register at a time" across the whole
--    system. This avoids the cashier accidentally running two open
--    cajas in parallel.
create unique index if not exists idx_cash_registers_single_open
  on cash_registers((1))
  where status = 'open';

-- 6) Helpful lookup for stats filtering by shift.
create index if not exists idx_cash_registers_shift
  on cash_registers(shift);
