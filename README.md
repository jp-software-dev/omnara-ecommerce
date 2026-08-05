# Omnara — E-Commerce

Plataforma de e-commerce multi-categoría (demo de portafolio para el paquete
"E-Commerce de Alto Rendimiento"). Catálogo con variantes, roles admin/vendedor,
checkout con Stripe, bilingüe (ES/EN) y multi-moneda (MXN/USD).

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security, Edge Functions)
- **Pagos:** Stripe (modo test)
- **i18n:** next-intl (`/es`, `/en`)
- **Estado:** TanStack Query + Zustand
- **Hosting:** Vercel + Supabase

## Desarrollo local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Copia `.env.example` a `.env.local` y completa las variables de Supabase antes
de correr el proyecto:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Estructura

```
src/
  app/[locale]/(shop)/     rutas públicas: home, categoría, producto, carrito, checkout
  app/[locale]/(account)/  cuenta del usuario
  app/[locale]/(admin)/    panel de administración
  app/[locale]/login|signup
  app/api/webhooks/stripe/ webhook de Stripe
  components/ui/           primitivos shadcn/ui
  components/auth/         formularios de login/signup
  i18n/                    configuración de next-intl
  lib/supabase/            clientes de Supabase + tipos generados
  messages/                textos ES/EN
```

## Base de datos

El esquema (16 tablas con Row Level Security) vive en el proyecto Supabase
`omnara-ecommerce`. Los tipos de TypeScript en `src/lib/supabase/types.ts` se
generan desde ese esquema real.
