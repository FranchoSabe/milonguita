-- ============================================
-- POS Milonguita - Database Schema (complete)
-- Run this in a FRESH Supabase project's SQL Editor.
-- If migrating from an existing DB, use the files in
-- supabase/migrations/ instead.
-- ============================================

create extension if not exists "uuid-ossp";

-- ============================================
-- Table: products
-- ============================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric not null check (price >= 0),
  category text,
  description text,
  points integer not null default 0,
  stock integer not null default 0,
  stock_enabled boolean not null default false,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

create index idx_products_active on products(active);
create index idx_products_category on products(category);
create index idx_products_display_order on products(display_order);

-- ============================================
-- Table: product_option_groups
-- ============================================
create table product_option_groups (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  selection_type text not null default 'single'
    check (selection_type in ('single', 'multi')),
  required boolean not null default true,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index idx_option_groups_product on product_option_groups(product_id);

-- ============================================
-- Table: product_options
-- ============================================
create table product_options (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references product_option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric not null default 0,
  is_default boolean not null default false,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index idx_options_group on product_options(group_id);

-- ============================================
-- Table: promotions
-- ============================================
create table promotions (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric not null check (price >= 0),
  items jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

create index idx_promotions_active on promotions(active);

-- ============================================
-- Table: dynamic_packs
-- ============================================
create table dynamic_packs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric not null check (price >= 0),
  total_units integer not null check (total_units > 0),
  category_filter text not null,
  points integer not null default 0,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index idx_dynamic_packs_active on dynamic_packs(active);

-- ============================================
-- Table: cash_registers
-- ============================================
create table cash_registers (
  id uuid primary key default uuid_generate_v4(),
  opened_at timestamp with time zone default now(),
  closed_at timestamp with time zone,
  total_sales numeric not null default 0,
  status text not null default 'open'
    check (status in ('open', 'closed')),
  business_day date not null,
  shift text not null
    check (shift in ('mediodia', 'noche'))
);

create unique index idx_cash_registers_business_day_shift
  on cash_registers(business_day, shift);
create unique index idx_cash_registers_single_open
  on cash_registers((1)) where status = 'open';
create index idx_cash_registers_status on cash_registers(status);
create index idx_cash_registers_shift on cash_registers(shift);

-- ============================================
-- Table: customers
-- ============================================
create table customers (
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

create index idx_customers_phone on customers(phone);
create index idx_customers_name on customers(name);

-- ============================================
-- Table: customer_points_history
-- ============================================
create table customer_points_history (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  sale_id uuid,  -- FK added after sales table
  movement_type text not null
    check (movement_type in ('earn', 'redeem', 'adjustment')),
  points_delta integer not null,
  reason text,
  balance_after integer,
  created_at timestamp with time zone default now()
);

create index idx_points_history_customer
  on customer_points_history(customer_id, created_at desc);

-- ============================================
-- Table: sales
-- ============================================
create table sales (
  id uuid primary key default uuid_generate_v4(),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text
    check (
      payment_method is null
      or payment_method in ('efectivo', 'qr', 'transferencia')
    ),
  status text not null default 'open'
    check (status in ('open', 'paid', 'voided')),
  paid_at timestamp with time zone,
  order_number integer,
  customer_name text,
  created_at timestamp with time zone default now(),
  cash_register_id uuid references cash_registers(id),
  customer_id uuid references customers(id) on delete set null,
  points_earned integer not null default 0,
  points_redeemed integer not null default 0
);

create index idx_sales_created_at on sales(created_at);
create index idx_sales_cash_register_id on sales(cash_register_id);
create index idx_sales_customer_id on sales(customer_id);
create unique index idx_sales_register_order_number
  on sales(cash_register_id, order_number)
  where order_number is not null;
create index idx_sales_register_status
  on sales(cash_register_id, status);

-- Add FK from customer_points_history to sales
alter table customer_points_history
  add constraint customer_points_history_sale_id_fkey
  foreign key (sale_id) references sales(id) on delete set null;
create index idx_points_history_sale on customer_points_history(sale_id);

-- ============================================
-- Table: stock_movements
-- ============================================
create table stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  movement_type text not null
    check (movement_type in ('ingress', 'adjustment', 'sale', 'correction')),
  quantity_delta integer not null,
  reason text,
  sale_id uuid references sales(id) on delete set null,
  balance_after integer,
  created_at timestamp with time zone default now()
);

create index idx_stock_movements_product
  on stock_movements(product_id, created_at desc);
create index idx_stock_movements_sale on stock_movements(sale_id);

-- ============================================
-- Row Level Security (authenticated users only)
-- ============================================
alter table products enable row level security;
alter table product_option_groups enable row level security;
alter table product_options enable row level security;
alter table promotions enable row level security;
alter table dynamic_packs enable row level security;
alter table cash_registers enable row level security;
alter table customers enable row level security;
alter table customer_points_history enable row level security;
alter table sales enable row level security;
alter table stock_movements enable row level security;

create policy "Authenticated full access to products" on products
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to option groups" on product_option_groups
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to options" on product_options
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to promotions" on promotions
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to dynamic_packs" on dynamic_packs
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to cash_registers" on cash_registers
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to customers" on customers
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to points history" on customer_points_history
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to sales" on sales
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to stock_movements" on stock_movements
  for all to authenticated using (true) with check (true);

-- ============================================
-- RPC Functions
-- ============================================

-- Apply stock movement and update products.stock atomically
create or replace function apply_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity_delta integer,
  p_reason text default null,
  p_sale_id uuid default null
) returns stock_movements
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
  v_movement stock_movements;
begin
  update products
  set stock = stock + p_quantity_delta
  where id = p_product_id
  returning stock into v_new_balance;

  if v_new_balance is null then
    raise exception 'Product % not found', p_product_id;
  end if;

  insert into stock_movements (product_id, movement_type, quantity_delta, reason, sale_id, balance_after)
  values (p_product_id, p_movement_type, p_quantity_delta, p_reason, p_sale_id, v_new_balance)
  returning * into v_movement;

  return v_movement;
end;
$$;

grant execute on function apply_stock_movement(uuid, text, integer, text, uuid) to authenticated;

-- Apply points movement and update customer balance atomically
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

-- Register a sale against a customer (update totals + visits + last_visit)
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
