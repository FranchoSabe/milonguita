# POS Milonguita

## Descripción del proyecto

Web app de punto de venta (POS) para local de comida. Permite registrar ventas, administrar productos y promociones, gestionar caja diaria y generar reportes. Diseñado para uso en tablet/desktop en una caja registradora.

**Stack**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase + Vercel.

## Stack y versiones

- **Next.js 14** — App Router, `"use client"` para páginas interactivas
- **TypeScript** — strict mode
- **Tailwind CSS** — con CSS variables para theming (paleta naranja)
- **shadcn/ui** — componentes base (Button, Dialog, Input, Label) implementados manualmente en `src/components/ui/`
- **Supabase JS client v2** — `@supabase/supabase-js`
- **Recharts** — gráficos de barras para reportes
- **Lucide React** — iconografía
- **date-fns** — utilidades de fechas (disponible pero se usa mayormente `Intl`)

## Estructura de carpetas

```
src/
├── app/
│   ├── layout.tsx          # Layout principal con navegación inferior
│   ├── page.tsx            # Pantalla de venta (home)
│   ├── globals.css         # Estilos globales + CSS print para tickets
│   ├── reports/
│   │   └── page.tsx        # Página de reportes y cierre de caja
│   └── settings/
│       └── page.tsx        # Configuración de productos, promos y general
├── components/
│   ├── navigation.tsx      # Barra de navegación inferior (3 tabs)
│   ├── pos/
│   │   ├── sale-modal.tsx  # Modal full-screen del flujo de venta
│   │   └── ticket.tsx      # Ticket de impresión (preview + print)
│   └── ui/
│       ├── button.tsx      # Componente Button (shadcn)
│       ├── dialog.tsx      # Componente Dialog (shadcn)
│       ├── input.tsx       # Componente Input (shadcn)
│       └── label.tsx       # Componente Label (shadcn)
└── lib/
    ├── supabase.ts         # Cliente Supabase (singleton)
    ├── types.ts            # Interfaces TypeScript
    ├── queries.ts          # Todas las queries a Supabase
    └── utils.ts            # Helpers (formateo moneda, fechas, cn)

supabase/
└── schema.sql              # DDL completo para crear tablas en Supabase
```

## Modelo de datos

4 tablas en Supabase (PostgreSQL):

- **products**: Productos del menú (nombre, precio, categoría, activo/inactivo)
- **promotions**: Combos/promociones (nombre, descripción, precio especial, items JSONB)
- **cash_registers**: Cajas diarias (apertura, cierre, total ventas, estado open/closed)
- **sales**: Ventas registradas (items JSONB, subtotal, descuento, total, método de pago, FK a cash_register)

**Relaciones**: `sales.cash_register_id` → `cash_registers.id`

RLS habilitado con policies que permiten acceso anónimo completo (auth anónimo de Supabase).

## Lógica de negocio clave

### Flujo de caja
1. Al entrar, la app verifica si hay una caja con `status = 'open'`
2. Si no hay → muestra botón "Abrir Caja" (crea registro en `cash_registers`)
3. Con caja abierta → se pueden registrar ventas
4. Cierre de caja desde `/reports` → actualiza status a 'closed', guarda total, timestamp
5. No se pueden registrar ventas sin caja abierta

### Cálculo de totales
- **Subtotal** = suma de (precio × cantidad) de cada item en el carrito
- **Descuento** = monto fijo ingresado manualmente (no porcentaje)
- **Total** = max(0, subtotal - descuento)
- Los items del carrito pueden ser productos o promociones, ambos con precio unitario y cantidad

### Ticket de impresión
- Usa `window.print()` con CSS `@media print` en `globals.css`
- El div `#ticket-print` se muestra solo en impresión, oculto en pantalla
- Ancho optimizado para papel de 80mm
- Muestra: nombre del local (de localStorage), fecha/hora, items, descuento, total, método de pago
- Vista previa del ticket en pantalla (`TicketPreview`) tras confirmar venta

## Convenciones del proyecto

- **Componentes**: PascalCase, un componente por archivo
- **Archivos**: kebab-case (`sale-modal.tsx`, `cash-register.ts`)
- **Queries a Supabase**: funciones async exportadas desde `src/lib/queries.ts`, nombradas como `getX`, `createX`, `updateX`
- **Manejo de errores**: try/catch en cada llamada a Supabase, `console.error` + `alert()` para errores del usuario
- **Estado**: `useState` + `useEffect` (no hay state management global)
- **Páginas**: todas son `"use client"` por la interactividad requerida

## Variables de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase (ej: `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase |

Ambas son públicas (prefijo `NEXT_PUBLIC_`) porque se usan desde el cliente.

## Comandos útiles

```bash
# Desarrollo local
npm run dev

# Build de producción
npm run build

# Correr schema en Supabase
# Copiar contenido de supabase/schema.sql y pegarlo en el SQL Editor de Supabase

# Deploy en Vercel
# Push a main → deploy automático (si está conectado)
vercel deploy
```

## Áreas a mejorar / TODOs

- [ ] Agregar autenticación real (login con PIN o usuario/contraseña)
- [ ] Soporte offline / PWA con sync
- [ ] Exportar reportes a CSV/Excel
- [ ] Dashboard con métricas semanales/mensuales
- [ ] Soporte para múltiples cajas simultáneas
- [ ] Gestión de stock / inventario
- [ ] Notificaciones de bajo stock
- [ ] Temas / modo oscuro
- [ ] Tests unitarios y de integración
- [ ] Validación de formularios más robusta (zod)
