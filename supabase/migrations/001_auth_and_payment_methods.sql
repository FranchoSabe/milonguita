-- ============================================
-- Migration 001: Auth + payment method update
-- Apply this in the Supabase SQL Editor after enabling email/password auth.
-- ============================================

-- 1) Convert any legacy 'tarjeta' payment rows to 'qr' (Mercado Pago)
update sales set payment_method = 'qr' where payment_method = 'tarjeta';

-- 2) Swap the CHECK constraint: remove tarjeta, add qr
alter table sales drop constraint if exists sales_payment_method_check;
alter table sales add constraint sales_payment_method_check
  check (payment_method in ('efectivo', 'qr', 'transferencia'));

-- 3) Close public RLS policies, open restricted ones for authenticated users only
drop policy if exists "Allow all access to products" on products;
drop policy if exists "Allow all access to promotions" on promotions;
drop policy if exists "Allow all access to sales" on sales;
drop policy if exists "Allow all access to cash_registers" on cash_registers;

create policy "Authenticated full access to products" on products
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to promotions" on promotions
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to sales" on sales
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to cash_registers" on cash_registers
  for all to authenticated using (true) with check (true);
