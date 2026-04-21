-- =========================================================================
-- SEED: Menú completo de Milonguita
-- Pegar y correr en el SQL Editor de Supabase DESPUÉS de aplicar las
-- migraciones 001, 002 y 003.
--
-- Este script es idempotente-ish: borra primero todo lo cargado en las
-- tablas de catálogo (products, option groups, options, dynamic_packs).
-- Si ya tenés ventas asociadas a esos products, NO borres — los FK de sales
-- lo van a impedir o dejar huérfanos. Para una instalación fresca, va OK.
-- =========================================================================

begin;

-- --- Limpieza opcional (descomentar para reset total del catálogo) --------
-- delete from product_options;
-- delete from product_option_groups;
-- delete from dynamic_packs;
-- delete from products;

-- --- Helper: crea una pizza con sus grupos de opciones estándar -----------
-- Precio base = ENTERA (default). "Media" resta la diferencia.
create or replace function _seed_pizza(
  p_name text,
  p_desc text,
  p_media_price numeric,
  p_entera_price numeric,
  p_display_order integer
) returns uuid
language plpgsql
as $$
declare
  v_pizza_id uuid;
  v_size_group_id uuid;
  v_mass_group_id uuid;
begin
  insert into products (name, price, category, description, stock_enabled, points, display_order, active)
  values (p_name, p_entera_price, 'Pizzas', p_desc, false, 3, p_display_order, true)
  returning id into v_pizza_id;

  insert into product_option_groups (product_id, name, selection_type, required, display_order)
  values (v_pizza_id, 'Tamaño', 'single', true, 0)
  returning id into v_size_group_id;

  insert into product_options (group_id, name, price_delta, is_default, display_order)
  values
    (v_size_group_id, 'Entera', 0, true, 0),
    (v_size_group_id, 'Media', p_media_price - p_entera_price, false, 1);

  insert into product_option_groups (product_id, name, selection_type, required, display_order)
  values (v_pizza_id, 'Masa', 'single', true, 1)
  returning id into v_mass_group_id;

  insert into product_options (group_id, name, price_delta, is_default, display_order)
  values
    (v_mass_group_id, 'Común', 0, true, 0),
    (v_mass_group_id, 'Integral', 3000, false, 1);

  return v_pizza_id;
end;
$$;

-- --- PIZZAS ---------------------------------------------------------------
-- Precio base = media. "Entera" suma la diferencia como price_delta.
-- "Integral" suma $3.000 fijos.

select _seed_pizza('Muzzarella',              'Salsa, queso muzzarella',                                              5000,  10000, 1);
select _seed_pizza('Muzzarella c/ huevo duro','Salsa, queso muzzarella, huevo duro rallado',                          5500,  11000, 2);
select _seed_pizza('Fugazzeta',               'Cebolla cruda, queso muzzarella',                                      5500,  11000, 3);
select _seed_pizza('Fugazzeta especial',      'Cebolla cruda, queso muzzarella, jamón',                               7000,  14000, 4);
select _seed_pizza('Morrones',                'Salsa, queso muzzarella, morrón',                                      6500,  13000, 5);
select _seed_pizza('Especial',                'Salsa, queso muzzarella, jamón',                                       6500,  13000, 6);
select _seed_pizza('Especial con anchoas',    'Salsa, queso muzzarella, jamón, anchoas',                             11000,  22000, 7);
select _seed_pizza('Napolitana',              'Salsa, queso muzzarella, tomate, huevo duro',                          6500,  13000, 8);
select _seed_pizza('Napolitana especial',     'Salsa, queso muzzarella, jamón, tomate, huevo duro',                   7500,  15000, 9);
select _seed_pizza('Tomate y ajo',            'Salsa, queso muzzarella, tomate, ajo',                                 6500,  13000, 10);
select _seed_pizza('Rúcula c/ cherry',        'Salsa, queso muzzarella, rúcula, ajo, queso sardo rallado, tomate cherry', 8500, 17000, 11);
select _seed_pizza('Rúcula c/ crudo',         'Salsa, queso muzzarella, rúcula, ajo, queso sardo rallado, jamón crudo', 11000, 22000, 12);
select _seed_pizza('Verdura',                 'Salsa, queso muzzarella, verdura, queso sardo rallado',                9000,  18000, 13);
select _seed_pizza('Capresse',                'Salsa, queso muzzarella, tomate, albahaca',                            7000,  14000, 14);
select _seed_pizza('Provenzal',               'Salsa, queso muzzarella, provenzal (ajo y perejil)',                   6000,  12000, 15);
select _seed_pizza('Bomba',                   'Salsa, queso muzzarella, papas fritas, huevos fritos',                11000,  22000, 16);
select _seed_pizza('Verdeo',                  'Salsa, queso muzzarella, verdeo',                                      7500,  15000, 17);
select _seed_pizza('Verdeo especial',         'Salsa, queso muzzarella, jamón, verdeo',                               9500,  19000, 18);
select _seed_pizza('Panceta c/ huevo duro',   'Salsa, queso muzzarella, panceta, huevo duro rallado',                 8000,  16000, 19);
select _seed_pizza('Panceta c/ huevo frito',  'Salsa, queso muzzarella, panceta, huevo frito',                       11000,  22000, 20);
select _seed_pizza('Longaniza',               'Salsa, queso muzzarella, longaniza',                                   7000,  14000, 21);
select _seed_pizza('Anchoas c/ muzza',        'Salsa, queso muzzarella, anchoas',                                     8000,  16000, 22);
select _seed_pizza('Anchoas c/ salsa',        'Salsa, anchoas',                                                       7500,  15000, 23);
select _seed_pizza('Provolone',               'Salsa, queso muzzarella, provolone',                                   8000,  16000, 24);
select _seed_pizza('Roquefort',               'Salsa, queso muzzarella, roquefort',                                   8000,  16000, 25);
select _seed_pizza('Cuatro quesos',           'Salsa, queso muzzarella, roquefort, provolone, sardo',                10500,  21000, 26);
select _seed_pizza('Ananá',                   'Salsa, queso muzzarella, ananá, morrón',                               9000,  18000, 27);
select _seed_pizza('Ananá especial',          'Salsa, queso muzzarella, jamón, ananá, morrón',                       11000,  22000, 28);
select _seed_pizza('Palmitos',                'Salsa, queso muzzarella, jamón, palmitos, salsa golf',                 9000,  18000, 29);
select _seed_pizza('Champignones',            'Salsa, queso muzzarella, champignones, queso sardo',                   8500,  17000, 30);
select _seed_pizza('Milonguita',              'Salsa, queso muzzarella, jamón, verdeo, champignones, queso sardo',   12500,  25000, 31);

drop function _seed_pizza(text, text, numeric, numeric, integer);

-- --- EMPANADAS ------------------------------------------------------------
-- Se venden por unidad ($2.500) con stock por sabor.
-- La "docena" es un pack dinámico definido más abajo.

insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Carne cortada a cuchillo', 2500, 'Empanadas', null, true, 1, 1, true),
  ('Bondiola braseada',        2500, 'Empanadas', null, true, 1, 2, true),
  ('Panceta y huevo',          2500, 'Empanadas', null, true, 1, 3, true),
  ('Jamón y queso',            2500, 'Empanadas', null, true, 1, 4, true),
  ('Carne picada',             2500, 'Empanadas', null, true, 1, 5, true),
  ('Calabresa',                2500, 'Empanadas', null, true, 1, 6, true),
  ('Pollo',                    2500, 'Empanadas', null, true, 1, 7, true),
  ('Atún',                     2500, 'Empanadas', null, true, 1, 8, true),
  ('Humita',                   2500, 'Empanadas', null, true, 1, 9, true),
  ('Verdura',                  2500, 'Empanadas', null, true, 1, 10, true),
  ('Capresse (empanada)',      2500, 'Empanadas', 'Capresse', true, 1, 11, true),
  ('Fugazzeta (empanada)',     2500, 'Empanadas', 'Fugazzeta', true, 1, 12, true),
  ('Roquefort (empanada)',     2500, 'Empanadas', 'Roquefort', true, 1, 13, true),
  ('Cuatro quesos (empanada)', 2500, 'Empanadas', 'Cuatro quesos', true, 1, 14, true),
  ('Morrón y queso',           2500, 'Empanadas', null, true, 1, 15, true),
  ('Carne/pollo (veggie)',     2500, 'Empanadas', 'Versión veggie', true, 1, 16, true);

-- Nota: "Canastitas (consultar sabores)" se deja para cargarlo manualmente
-- si alguna vez le ponés precio fijo.

-- --- PACK DINÁMICO: DOCENA ------------------------------------------------
insert into dynamic_packs (name, price, total_units, category_filter, points, active, display_order)
values
  ('Docena de empanadas', 30000, 12, 'Empanadas', 5, true, 1);

-- --- ACOMPAÑAMIENTOS ------------------------------------------------------
insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Tarta chica',            12000, 'Acompañamientos', null,                          false, 2, 1, true),
  ('Tarta mediana',          15000, 'Acompañamientos', null,                          false, 2, 2, true),
  ('Tarta grande',           20000, 'Acompañamientos', null,                          false, 2, 3, true),
  ('Tortilla chica',         12000, 'Acompañamientos', null,                          false, 2, 4, true),
  ('Tortilla grande',        20000, 'Acompañamientos', null,                          false, 2, 5, true),
  ('Tortilla grande rellena',26000, 'Acompañamientos', 'Rellena jamón y queso',       false, 3, 6, true),
  ('Papas fritas simples',   12500, 'Acompañamientos', null,                          false, 1, 7, true),
  ('Papas al horno',         12500, 'Acompañamientos', null,                          false, 1, 8, true),
  ('Papas rústicas',         13000, 'Acompañamientos', null,                          false, 1, 9, true),
  ('Puré',                   12500, 'Acompañamientos', null,                          false, 1, 10, true),
  ('Papas fritas completas', 21000, 'Acompañamientos', 'Cheddar, panceta y verdeo',   false, 2, 11, true),
  ('Ensaladas',              10000, 'Acompañamientos', null,                          false, 1, 12, true);

-- --- MILANESAS ------------------------------------------------------------
insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Sanguche milanesa completo',      13000, 'Milanesas', 'Jamón, queso, lechuga, tomate y mayonesa', false, 3, 1, true),
  ('Mila simple sin guarnición',      11000, 'Milanesas', 'Para compartir',                            false, 3, 2, true),
  ('Mila napo sin guarnición',        12500, 'Milanesas', 'Para compartir',                            false, 3, 3, true),
  ('Mila simple con fritas',          25000, 'Milanesas', 'Para compartir',                            false, 4, 4, true),
  ('Mila napo con fritas',            25000, 'Milanesas', 'Para compartir',                            false, 4, 5, true),
  ('Mila simple indiv. con fritas',   12500, 'Milanesas', null,                                        false, 3, 6, true),
  ('Mila napo indiv. con fritas',     12500, 'Milanesas', null,                                        false, 3, 7, true),
  ('Huevos fritos x2',                 5000, 'Milanesas', null,                                        false, 1, 8, true);

-- --- MENÚ ESPECIAL --------------------------------------------------------
-- Los ravioles tienen variante de relleno.

insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Burger completa sin fritas',      9000,  'Menú especial', 'Jamón, queso, tomate y mayonesa', false, 2, 1, true),
  ('Burger completa con fritas',     15000,  'Menú especial', 'Jamón, queso, tomate y mayonesa', false, 3, 2, true),
  ('Pata muslo con fritas',          12000,  'Menú especial', null,                              false, 3, 3, true),
  ('Canelones con bolognesa',        10000,  'Menú especial', null,                              false, 3, 5, true),
  ('Spaghettis caseritos',           10000,  'Menú especial', 'Con salsa bolognesa',             false, 3, 6, true),
  ('Capelettinis con bolognesa',     10000,  'Menú especial', null,                              false, 3, 7, true),
  ('Pastel de papa',                 10000,  'Menú especial', null,                              false, 3, 8, true);

-- Ravioles con variante "Relleno"
do $$
declare
  v_ravioles_id uuid;
  v_relleno_group_id uuid;
begin
  insert into products (name, price, category, description, stock_enabled, points, display_order, active)
  values ('Ravioles con bolognesa', 10000, 'Menú especial', 'Elegí el relleno', false, 3, 4, true)
  returning id into v_ravioles_id;

  insert into product_option_groups (product_id, name, selection_type, required, display_order)
  values (v_ravioles_id, 'Relleno', 'single', true, 0)
  returning id into v_relleno_group_id;

  insert into product_options (group_id, name, price_delta, is_default, display_order)
  values
    (v_relleno_group_id, 'Espinaca y queso', 0, true, 0),
    (v_relleno_group_id, 'Carne y verdura',  0, false, 1);
end $$;

-- --- BEBIDAS --------------------------------------------------------------
insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Gaseosa 2.25L',          7000, 'Bebidas', null, true, 1, 1, true),
  ('Gaseosa 1.5L',           5500, 'Bebidas', null, true, 1, 2, true),
  ('Gaseosa 600ml',          3500, 'Bebidas', null, true, 0, 3, true),
  ('Agua saborizada 2L',     5500, 'Bebidas', null, true, 1, 4, true),
  ('Agua saborizada 1.5L',   4500, 'Bebidas', null, true, 0, 5, true),
  ('Agua saborizada 600ml',  3500, 'Bebidas', null, true, 0, 6, true),
  ('Agua sin gas 2L',        5000, 'Bebidas', null, true, 1, 7, true),
  ('Agua sin gas 1.5L',      4000, 'Bebidas', null, true, 0, 8, true),
  ('Agua sin gas 500ml',     3500, 'Bebidas', null, true, 0, 9, true);

-- --- CERVEZAS -------------------------------------------------------------
insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Brahma / Quilmes 473ml',              3500, 'Cervezas', null,                                        true, 1, 1, true),
  ('Stella / Corona / Heineken 473ml',    6000, 'Cervezas', null,                                        true, 1, 2, true),
  ('Botella / Latón 710ml',               9000, 'Cervezas', 'Brahma, Quilmes, Stella, Corona, Heineken', true, 2, 3, true);

-- --- POSTRES --------------------------------------------------------------
insert into products (name, price, category, description, stock_enabled, points, display_order, active)
values
  ('Chocotorta helada', 5000, 'Postres', null, true, 1, 1, true);

commit;

-- =========================================================================
-- Reporte final (podés correr esto después para verificar)
-- =========================================================================
-- select category, count(*) from products group by category order by category;
-- select count(*) from product_option_groups;
-- select count(*) from product_options;
-- select * from dynamic_packs;
