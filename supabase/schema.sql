-- ============================================
-- POS Milonguita - Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ============================================
-- Table: products
-- ============================================
create table products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  price numeric not null check (price >= 0),
  category text,
  active boolean not null default true,
  created_at timestamp with time zone default now()
);

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

-- ============================================
-- Table: cash_registers
-- ============================================
create table cash_registers (
  id uuid primary key default uuid_generate_v4(),
  opened_at timestamp with time zone default now(),
  closed_at timestamp with time zone,
  total_sales numeric not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  business_day date not null
);

create unique index idx_cash_registers_business_day
  on cash_registers(business_day);

-- ============================================
-- Table: sales
-- ============================================
create table sales (
  id uuid primary key default uuid_generate_v4(),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  payment_method text not null check (payment_method in ('efectivo', 'qr', 'transferencia')),
  created_at timestamp with time zone default now(),
  cash_register_id uuid references cash_registers(id)
);

-- ============================================
-- Indexes
-- ============================================
create index idx_sales_created_at on sales(created_at);
create index idx_sales_cash_register_id on sales(cash_register_id);
create index idx_products_active on products(active);
create index idx_promotions_active on promotions(active);
create index idx_cash_registers_status on cash_registers(status);

-- ============================================
-- Row Level Security (RLS)
-- Only authenticated users can read/write.
-- ============================================
alter table products enable row level security;
alter table promotions enable row level security;
alter table sales enable row level security;
alter table cash_registers enable row level security;

create policy "Authenticated full access to products" on products
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to promotions" on promotions
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to sales" on sales
  for all to authenticated using (true) with check (true);
create policy "Authenticated full access to cash_registers" on cash_registers
  for all to authenticated using (true) with check (true);

-- ============================================
-- Sample data (optional - uncomment to use)
-- ============================================
-- insert into products (name, price, category) values
--   ('Empanada de carne', 800, 'Empanadas'),
--   ('Empanada de jamón y queso', 800, 'Empanadas'),
--   ('Empanada de verdura', 800, 'Empanadas'),
--   ('Pizza muzzarella', 5500, 'Pizzas'),
--   ('Pizza napolitana', 6000, 'Pizzas'),
--   ('Coca-Cola 500ml', 1500, 'Bebidas'),
--   ('Agua mineral 500ml', 1000, 'Bebidas'),
--   ('Cerveza artesanal', 3500, 'Bebidas'),
--   ('Milanesa con papas fritas', 7500, 'Platos'),
--   ('Hamburguesa completa', 6500, 'Platos');
