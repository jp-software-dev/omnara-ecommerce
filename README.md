# Omnara — E-Commerce

![Next.js](https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/supabase-%233ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white)
![Stripe](https://img.shields.io/badge/stripe-%23635BFF.svg?style=for-the-badge&logo=stripe&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2306B6D4.svg?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

This repository is the full-stack architecture behind **Omnara**, a multi-category e-commerce platform (portfolio demo for the "E-Commerce de Alto Rendimiento" package). Built with Next.js and Supabase, it models a real production catalog — clothing, footwear, electronics, accessories and home goods — each with its own type-specific attributes, behind a role-based admin/vendor panel and a Stripe checkout that is architecturally guaranteed to never process a real charge.

## ✨ Features

* **Category-Aware Product Architecture:** Products carry type-specific specifications (brand/model for electronics, material/size for apparel, dimensions for home goods) stored as JSONB and rendered dynamically in both the admin form and the product page — not a one-size-fits-all schema.
* **Fail-Safe Stripe Checkout:** The Stripe client refuses to boot with anything but a test-mode key, orders are only ever written from a signature-verified webhook (never trusted from the client), and every price is re-computed server-side against the database before a session is created.
* **Row-Level Security, Not UI Tricks:** Admin, vendor and customer roles are enforced at the Postgres layer via Row Level Security — a vendor querying the database directly gets the same scoping as the UI shows, because the database is the one enforcing it.
* **Admin/Vendor Operations Panel:** Product CRUD, per-variant inventory adjustment with low-stock alerts, and order management, all gated by the same RLS policies that protect the public storefront.
* **Bilingual & Multi-Currency:** Full ES/EN interface via next-intl and a live MXN/USD switcher that recalculates every displayed price from a single exchange-rate source of truth.
* **Original Visual Identity:** A warm stone-and-gold design system (Rubik/Nunito Sans) with accessible interaction details — skip-to-content link, visible focus states, reduced-motion support.

## 🛠 Technologies Used

* **Core Framework:** Next.js 16 (App Router), React 19
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4, shadcn/ui (Base UI primitives)
* **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security)
* **Payments:** Stripe (test mode, safety-locked)
* **State & Data:** Zustand, TanStack Query
* **i18n:** next-intl (`/es`, `/en`)
* **Hosting:** Vercel + Supabase

## 🚀 Installation & Setup

Follow these steps to run the development server locally. Ensure you have Node.js installed on your system.

1. Clone the repository:
   ```bash
   git clone https://github.com/jp-software-dev/omnara-ecommerce.git
   ```
