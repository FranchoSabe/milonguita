-- ============================================
-- Migration 005: Order lifecycle on sales
-- Apply in the Supabase SQL Editor AFTER migration 004.
-- Turns every sale into an order that moves through:
--   open -> paid    (cashier cobra)
--   open -> voided  (cashier anula una orden abierta)
--   paid -> open    (cashier anula una cobrada para modificarla)
-- ============================================

-- 1) Order lifecycle columns on sales.
alter table sales
  add column if not exists status text not null default 'paid'
    check (status in ('open', 'paid', 'voided')),
  add column if not exists paid_at timestamp with time zone,
  add column if not exists order_number integer,
  add column if not exists customer_name text;

-- 2) Payment method only applies to paid sales.
alter table sales
  alter column payment_method drop not null;

-- Keep the existing enum check but allow null.
alter table sales
  drop constraint if exists sales_payment_method_check;
alter table sales
  add constraint sales_payment_method_check
    check (
      payment_method is null
      or payment_method in ('efectivo', 'qr', 'transferencia')
    );

-- 3) Backfill existing rows: they were always paid under the old model.
update sales
  set status = 'paid',
      paid_at = coalesce(paid_at, created_at)
  where status is distinct from 'voided' and paid_at is null;

-- 4) Order number is unique per cash register (resets each day).
create unique index if not exists idx_sales_register_order_number
  on sales(cash_register_id, order_number)
  where order_number is not null;

-- 5) Lookup open orders per register.
create index if not exists idx_sales_register_status
  on sales(cash_register_id, status);
