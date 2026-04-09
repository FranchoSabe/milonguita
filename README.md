# POS Milonguita

Sistema de punto de venta (POS) web para local de comida. Construido con Next.js 14, Supabase y Tailwind CSS.

## Setup

### 1. Crear proyecto en Supabase

1. Andá a [supabase.com](https://supabase.com) y creá un nuevo proyecto.
2. En el SQL Editor, copiá y ejecutá el contenido de `supabase/schema.sql`.
3. En Settings > API, copiá la **URL** y la **anon key**.

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editá `.env.local` con los valores de tu proyecto Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar dependencias y correr

```bash
npm install
npm run dev
```

La app estará disponible en `http://localhost:3000`.

### 4. Deploy en Vercel

1. Subí el repo a GitHub.
2. Conectá el repo en [vercel.com](https://vercel.com).
3. Configurá las variables de entorno (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en la configuración del proyecto en Vercel.
4. Deploy automático.

## Uso

1. **Abrir caja**: Al entrar a la app, hacé click en "Abrir Caja" para comenzar.
2. **Registrar ventas**: Desde la pantalla principal, usá el botón "Registrar Venta".
3. **Reportes**: En `/reports` podés ver el resumen del día, historial y cerrar caja.
4. **Configuración**: En `/settings` podés administrar productos, promociones y configurar el nombre del local.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **Supabase** (PostgreSQL + Auth anónimo)
- **Recharts** (gráficos)
- **Vercel** (deploy)
