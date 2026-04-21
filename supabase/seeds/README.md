# Seeds — carga inicial de datos

## Cómo usar

1. Abrí el SQL Editor de Supabase → **New query**.
2. Copiá TODO el contenido del archivo `.sql` que quieras cargar.
3. Pegalo y ejecutalo (`Run` o `Ctrl+Enter`).
4. Debería decir "Success" sin filas devueltas.
5. Verificá en la UI en `Config → Productos` que aparezcan todos.

## Archivos disponibles

### `menu_milonguita.sql`
Catálogo completo del local: 31 variedades de pizza con tamaño y masa,
16 sabores de empanada con stock, 12 acompañamientos, 8 milanesas,
8 ítems del menú especial, 9 bebidas, 3 cervezas, 1 postre, y un
pack dinámico "Docena de empanadas" ($30.000 con mix libre de 12).

**Requisito**: haber corrido antes las migraciones 001, 002 y 003.

**Pre-instalado:**
- Las pizzas tienen 2 grupos de opciones: **Tamaño** (Media / Entera)
  y **Masa** (Común / Integral +$3.000).
- Los ravioles tienen grupo **Relleno** (Espinaca y queso / Carne y verdura).
- Las empanadas tienen stock habilitado (en 0 — cargalo desde la UI).

**Puntos de fidelidad por defecto:**
- Pizza: 3 pts · Empanada: 1 pt · Milanesa: 3 pts · Acompañamiento: 2 pts
- Bebida/Cerveza/Postre: 1 pt · Menú especial: 3 pts

Podés ajustar cualquier campo desde `Config → Productos` una vez cargado.

## Reset del catálogo

Al inicio del seed hay un bloque comentado:

```sql
-- delete from product_options;
-- delete from product_option_groups;
-- delete from dynamic_packs;
-- delete from products;
```

Descomentalas si querés borrar el catálogo anterior antes de cargar.
⚠️ No hagas esto si ya tenés ventas asociadas a esos productos: los FK
de `sales.items` son JSON y no se rompen, pero `stock_movements.product_id`
se borra en cascada.

## Notas de interpretación del menú

- **Precio "Entera - Media"**: tomamos la Entera como precio base y default,
  y "Media" resta la diferencia como opción. Ej: Muzzarella base $10.000,
  opción Media −$5.000, opción Integral +$3.000 adicional.
- **Empanadas "Canastitas (consultar sabores)"**: no tiene precio fijo, así
  que no se incluye. Cargala manual si le asignás precio.
- **Empanadas con nombre repetido en pizzas** (Capresse, Fugazzeta, Roquefort,
  Cuatro quesos): se guardan con sufijo "(empanada)" para no confundirse con
  las pizzas homónimas. El nombre visible en la UI es el completo; la
  descripción aclara el sabor.
- **Docena de empanadas**: pack dinámico. En la venta el cajero arma el mix
  libre de 12 unidades. Precio $30.000. Bonus: 5 puntos extra.
