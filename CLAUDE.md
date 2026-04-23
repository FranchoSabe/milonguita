# POS Milonguita

## Descripción del proyecto

Web app de punto de venta (POS) para local de comida. Permite registrar ventas con flujo de órdenes (abrir → cobrar), administrar productos con variantes y stock, gestionar caja diaria por turno (mediodía/noche), fidelizar clientes con puntos, y generar reportes. Diseñado para uso en tablet/desktop en una caja registradora.

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase + Vercel.

## Stack y versiones

- **Next.js 14** — App Router, `"use client"` para páginas interactivas
- **TypeScript** — strict mode
- **Tailwind CSS** — con CSS variables para theming (paleta naranja)
- **shadcn/ui** — componentes base (Button, Dialog, Input, Label) implementados manualmente en `src/components/ui/`
- **Supabase JS client v2** — `@supabase/supabase-js`
- **Recharts** — gráficos de barras/líneas/torta para reportes
- **Lucide React** — iconografía
- **clsx + tailwind-merge** — utilidad `cn()` para clases condicionales

## Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx                # Layout principal con navegación inferior
│   ├── page.tsx                  # Pantalla principal: órdenes abiertas + apertura de caja
│   ├── globals.css               # Estilos globales + CSS print (comanda + ticket)
│   ├── login/
│   │   └── page.tsx              # Login con email/password (Supabase Auth)
│   ├── customers/
│   │   └── page.tsx              # Gestión de clientes, puntos, historial, WhatsApp
│   ├── settings/
│   │   └── page.tsx              # Configuración: productos, promos, packs, general
│   ├── stats/
│   │   └── page.tsx              # Estadísticas: KPIs, gráficos, filtro por turno
│   └── stock/
│       └── page.tsx              # Gestión de stock e inventario
├── components/
│   ├── navigation.tsx            # Barra de navegación inferior (5 tabs)
│   ├── pos/
│   │   ├── sale-modal.tsx        # Modal full-screen: flujo de orden + cobro
│   │   ├── comanda.tsx           # Comanda para cocina (impresión 80mm)
│   │   ├── ticket.tsx            # Ticket de venta + TicketPreview
│   │   ├── customer-picker.tsx   # Selector de cliente (búsqueda + creación rápida)
│   │   ├── variant-picker.tsx    # Selector de variantes de producto
│   │   ├── pack-builder.tsx      # Armador de packs dinámicos
│   │   └── cash-close-ticket.tsx # Ticket de cierre de caja + preview
│   ├── settings/
│   │   ├── products-manager.tsx  # CRUD productos con opciones/variantes
│   │   ├── promotions-manager.tsx # CRUD promociones
│   │   └── dynamic-packs-manager.tsx # CRUD packs dinámicos
│   ├── stats/
│   │   ├── stat-card.tsx         # Card de estadísticas con delta
│   │   └── date-range-picker.tsx # Selector de rango de fechas
│   └── ui/
│       ├── button.tsx            # Componente Button (shadcn)
│       ├── dialog.tsx            # Componente Dialog (shadcn)
│       ├── input.tsx             # Componente Input (shadcn)
│       └── label.tsx             # Componente Label (shadcn)
├── middleware.ts                  # Middleware de autenticación Supabase
└── lib/
    ├── supabase.ts               # Cliente Supabase (singleton browser)
    ├── supabase/
    │   ├── client.ts             # createBrowserClient
    │   ├── server.ts             # createServerClient
    │   └── middleware.ts         # Helper para middleware de auth
    ├── types.ts                  # Interfaces TypeScript (Product, Sale, CashRegister, etc.)
    ├── queries.ts                # Todas las queries a Supabase (~1060 líneas)
    ├── points.ts                 # Lógica de cálculo de puntos de fidelidad
    ├── stats.ts                  # Helpers para estadísticas (KPIs, buckets, rankings)
    └── utils.ts                  # Formateo: moneda, fechas, WhatsApp, dormancia, cn()

supabase/
├── schema.sql                    # DDL completo para instalación en Supabase limpio
└── migrations/                   # Migraciones incrementales (aplicar en orden)
    ├── 001_auth_and_payment_methods.sql
    ├── 002_products_variants_and_stock.sql
    ├── 003_customers_and_loyalty.sql
    ├── 004_cash_register_business_day.sql
    ├── 005_sales_order_lifecycle.sql
    └── 006_cash_register_shift.sql
```

## Modelo de datos

10 tablas en Supabase (PostgreSQL) + 3 funciones RPC:

### Tablas principales
- **products**: Productos del menú (nombre, precio, categoría, descripción, puntos, stock, variantes)
- **product_option_groups**: Grupos de opciones por producto (ej: "Masa", "Tamaño")
- **product_options**: Opciones dentro de cada grupo (ej: "Integral +$800")
- **promotions**: Combos/promociones (nombre, descripción, precio especial, items JSONB)
- **dynamic_packs**: Packs armables (ej: "½ docena empanadas", vendedor elige el mix)
- **cash_registers**: Cajas por turno (apertura, cierre, total, estado, `business_day`, `shift`)
- **sales**: Ventas/órdenes (items JSONB, status open/paid/voided, order_number, descuento, pago, cliente)
- **customers**: Clientes (nombre, teléfono, email, puntos, visitas, total gastado)
- **customer_points_history**: Historial de movimientos de puntos (earn/redeem/adjustment)
- **stock_movements**: Movimientos de inventario (ingress/adjustment/sale/correction)

### Funciones RPC
- **apply_stock_movement**: Actualiza stock del producto + inserta movimiento atómicamente
- **apply_points_movement**: Actualiza balance de puntos del cliente + inserta historial atómicamente
- **register_sale_for_customer**: Actualiza total_spent, visits, last_visit_at del cliente

### Relaciones clave
- `sales.cash_register_id` → `cash_registers.id`
- `sales.customer_id` → `customers.id`
- `product_option_groups.product_id` → `products.id`
- `product_options.group_id` → `product_option_groups.id`
- `stock_movements.product_id` → `products.id`
- `stock_movements.sale_id` → `sales.id`
- `customer_points_history.customer_id` → `customers.id`
- `customer_points_history.sale_id` → `sales.id`

RLS habilitado con policies `to authenticated` en todas las tablas.

## Lógica de negocio clave

### Flujo de caja (con turno)
1. Al entrar, la app verifica si hay una caja con `status = 'open'`
2. Si no hay → muestra selector de día laboral + turno (Mediodía/Noche)
3. Turnos ya usados (abiertos o cerrados) se deshabilitan para ese día
4. Solo una caja puede estar abierta a la vez en todo el sistema
5. Con caja abierta → se pueden crear órdenes
6. Cierre de caja desde "Estado de caja" → ticket de cierre imprimible

### Flujo de órdenes (lifecycle)
1. **Nueva orden**: usuario arma carrito → "Enviar a cocina" → crea `sale` con `status: 'open'`, `payment_method: null`
2. **Order number**: secuencial por caja (resetea cada turno), formato `#001`
3. **Comanda**: se imprime automáticamente para cocina (80mm) al crear/editar orden
4. **Editar orden**: puede agregar items → imprime comanda solo con los deltas
5. **Cobrar**: desde la lista de órdenes abiertas → paso de pago con descuento, puntos, método
6. **Anular cobro**: venta pagada puede volver a `open` (reversión de loyalty best-effort)
7. **Eliminar orden**: `status: 'voided'`, stock revertido

### Cálculo de totales
- **Subtotal** = suma de (precio × cantidad) de cada item en el carrito
- **Descuento** = monto fijo o porcentaje, ingresado en el paso de cobro
- **Canje de puntos** = puntos × tasa de conversión (configurable en localStorage)
- **Total** = max(0, subtotal - descuento - canje)

### Impresión (comanda + ticket)
- Usa `window.print()` con CSS `@media print` en `globals.css`
- `data-print-slot="comanda"` y `data-print-slot="ticket"` para selector CSS
- `body[data-print-mode]` controla cuál se imprime
- Comanda: items con cantidad grande, sin precios, con variantes
- Ticket: detalle completo con precios, descuento, puntos, método de pago
- Toast verde de confirmación siempre aparece (feedback independiente del print)

### Fidelización de clientes
- Cada producto tiene `points` (configurable)
- Al cobrar con cliente asignado: se suman puntos ganados, se restan canjeados
- `register_sale_for_customer` actualiza totales/visitas del cliente
- Puntos se pueden ajustar manualmente (cumpleaños, compensaciones)
- Historial unificado: ventas + ajustes en una timeline clickeable

## Convenciones del proyecto

- **Componentes**: PascalCase, un componente por archivo
- **Archivos**: kebab-case (`sale-modal.tsx`, `cash-close-ticket.tsx`)
- **Queries a Supabase**: funciones async exportadas desde `src/lib/queries.ts`, nombradas como `getX`, `createX`, `updateX`, `payX`
- **Manejo de errores**: try/catch en cada llamada a Supabase, `console.error` + `alert()` para errores del usuario
- **Estado**: `useState` + `useEffect` + `useMemo` (no hay state management global)
- **Páginas**: todas son `"use client"` por la interactividad requerida
- **Git**: trabajo directo en `main`, sin branches

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej: `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |

Ambas son públicas (prefijo `NEXT_PUBLIC_`) porque se usan desde el cliente.

## Configuración en localStorage

| Key | Uso |
|---|---|
| `store_name` | Nombre del local (aparece en tickets y comandas) |
| `points_rate` | Tasa de conversión puntos → pesos (default: 10) |

## Comandos útiles

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npx tsc --noEmit     # Verificación de tipos sin build

# Supabase: copiar supabase/schema.sql en el SQL Editor para DB nueva
# Migraciones: aplicar archivos en supabase/migrations/ en orden para DB existente

vercel deploy        # Deploy manual (o push a main para auto-deploy)
```

## Migraciones

Para una base de datos nueva, usar `supabase/schema.sql` directamente.

Para una base existente, aplicar las migraciones en orden desde el SQL Editor de Supabase:

| Migración | Descripción |
|---|---|
| 001 | Auth con email/password, constraintde payment_method actualizado |
| 002 | Variantes de producto, stock, packs dinámicos, función `apply_stock_movement` |
| 003 | Clientes, puntos de fidelidad, funciones `apply_points_movement` y `register_sale_for_customer` |
| 004 | Campo `business_day` en cash_registers |
| 005 | **Order lifecycle**: status (open/paid/voided), order_number, customer_name, paid_at en sales |
| 006 | **Turno (shift)**: mediodía/noche en cash_registers, constraint único por (día, turno) |

**Importante**: Si la app muestra error 406 al crear órdenes, probablemente falte aplicar las migraciones 005 y 006.

## Áreas a mejorar / TODOs

- [ ] Soporte offline / PWA con sync
- [ ] Exportar reportes a CSV/Excel
- [ ] Dashboard con métricas semanales/mensuales
- [ ] Notificaciones de bajo stock
- [ ] Temas / modo oscuro
- [ ] Tests unitarios y de integración
- [ ] Validación de formularios más robusta (zod)
