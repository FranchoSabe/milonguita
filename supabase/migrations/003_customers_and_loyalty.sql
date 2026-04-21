-- ============================================
-- Migration 003: Customers + loyalty points
-- Apply in the Supabase SQL Editor AFTER migration 002.
-- ============================================

-- 1) Customers
create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  notes text,
  points_balance integer not null default 0,
  total_spent numeric not null default 0,
  visits integer not null default 0,
  last_visit_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_customers_phone on customers(phone);
create index if not exists idx_customers_name on customers(name);

-- 2) Points history: one row per earn/redeem/adjustment
create table if not exists customer_points_history (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  movement_type text not null check (movement_type in ('earn', 'redeem', 'adjustment')),
  points_delta integer not null,
  reason text,
  balance_after integer,
  created_at timestamp with time zone default now()
);

create index if not exists idx_points_history_customer
  on customer_points_history(customer_id, created_at desc);
create index if not exists idx_points_history_sale on customer_points_history(sale_id);

-- 3) Link sales to a customer (optional)
alter table sales add column if not exists customer_id uuid references customers(id) on delete set null;
alter table sales add column if not exists points_earned integer not null default 0;
alter table sales add column if not exists points_redeemed integer not null default 0;

create index if not exists idx_sales_customer_id on sales(customer_id);

-- 4) RLS (authenticated only)
alter table customers enable row level security;
alter table customer_points_history enable row level security;

create policy "Authenticated full access to customers" on customers
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to points history" on customer_points_history
  for all to authenticated using (true) with check (true);

-- 5) Helper function: apply a points movement and update running balance atomically
create or replace function apply_points_movement(
  p_customer_id uuid,
  p_movement_type text,
  p_points_delta integer,
  p_reason text default null,
  p_sale_id uuid default null
) returns customer_points_history
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
  v_movement customer_points_history;
begin
  update customers
  set points_balance = points_balance + p_points_delta
  where id = p_customer_id
  returning points_balance into v_new_balance;

  if v_new_balance is null then
    raise exception 'Customer % not found', p_customer_id;
  end if;

  insert into customer_points_history
    (customer_id, movement_type, points_delta, reason, sale_id, balance_after)
  values
    (p_customer_id, p_movement_type, p_points_delta, p_reason, p_sale_id, v_new_balance)
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function apply_points_movement(uuid, text, integer, text, uuid) to authenticated;

-- 6) Helper function: record a sale against a customer (totals + visits + last_visit)
create or replace function register_sale_for_customer(
  p_customer_id uuid,
  p_sale_id uuid,
  p_amount numeric
) returns customers
language plpgsql
security definer
as $$
declare
  v_customer customers;
begin
  update customers
  set
    total_spent = total_spent + coalesce(p_amount, 0),
    visits = visits + 1,
    last_visit_at = now()
  where id = p_customer_id
  returning * into v_customer;

  if v_customer.id is null then
    raise exception 'Customer % not found', p_customer_id;
  end if;

  return v_customer;
end;
$$;

grant execute on function register_sale_for_customer(uuid, uuid, numeric) to authenticated;
