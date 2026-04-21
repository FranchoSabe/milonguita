-- ============================================
-- Migration 002: Product variants, stock, and dynamic packs
-- Apply in the Supabase SQL Editor AFTER migration 001.
-- ============================================

-- 1) Extend products with description, points, stock
alter table products add column if not exists description text;
alter table products add column if not exists points integer not null default 0;
alter table products add column if not exists stock integer not null default 0;
alter table products add column if not exists stock_enabled boolean not null default false;
alter table products add column if not exists display_order integer not null default 0;

create index if not exists idx_products_category on products(category);
create index if not exists idx_products_display_order on products(display_order);

-- 2) Option groups: a product can have groups like "Masa", "Salsa", "Tamaño"
create table if not exists product_option_groups (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name text not null,
  selection_type text not null default 'single' check (selection_type in ('single', 'multi')),
  required boolean not null default true,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists idx_option_groups_product on product_option_groups(product_id);

-- 3) Options inside each group: e.g. "Integral +$800" inside "Masa"
create table if not exists product_options (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references product_option_groups(id) on delete cascade,
  name text not null,
  price_delta numeric not null default 0,
  is_default boolean not null default false,
  display_order integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists idx_options_group on product_options(group_id);

-- 4) Stock movements: audit trail of ingresses, adjustments, sales
create table if not exists stock_movements (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  movement_type text not null check (movement_type in ('ingress', 'adjustment', 'sale', 'correction')),
  quantity_delta integer not null,
  reason text,
  sale_id uuid references sales(id) on delete set null,
  balance_after integer,
  created_at timestamp with time zone default now()
);

create index if not exists idx_stock_movements_product on stock_movements(product_id, created_at desc);
create index if not exists idx_stock_movements_sale on stock_movements(sale_id);

-- 5) Dynamic packs: e.g. "Media docena empanadas" → vendedor arma el mix
create table if not exists dynamic_packs (
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

create index if not exists idx_dynamic_packs_active on dynamic_packs(active);

-- 6) RLS for all new tables (authenticated only)
alter table product_option_groups enable row level security;
alter table product_options enable row level security;
alter table stock_movements enable row level security;
alter table dynamic_packs enable row level security;

create policy "Authenticated full access to option groups" on product_option_groups
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to options" on product_options
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to stock_movements" on stock_movements
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to dynamic_packs" on dynamic_packs
  for all to authenticated using (true) with check (true);

-- 7) Helper function: apply stock movement and update products.stock atomically
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
