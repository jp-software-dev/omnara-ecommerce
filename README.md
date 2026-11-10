# Omnara — Multi-Vendor Marketplace

![Next.js](https://img.shields.io/badge/next.js-%23000000.svg?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/supabase-%233ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white)
![Stripe](https://img.shields.io/badge/stripe-%23635BFF.svg?style=for-the-badge&logo=stripe&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2306B6D4.svg?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)

**Omnara** is a marketplace in the spirit of Mercado Libre: instead of one store selling its own stock, several independent student businesses sell side by side under one catalog, one cart and one checkout. Customers browse products from every seller, pay once, follow their order and review what they bought; each business manages its own products, inventory and sales from a role-scoped panel; an administrator oversees the whole platform.

It was built as a university project (IUEM — *Comercio Electrónico* and *Ingeniería de Software I*) and is organized around the concepts from that course: the participants of an e-commerce operation, the platform's core functions, the payment process, the front-end / back-end split, and the advantages and challenges of selling online. Those mappings are laid out below.

> **Demo safety:** the Stripe client refuses to start with anything but a test-mode key, so Omnara can never process a real charge. Use the test card `4242 4242 4242 4242`, any future expiry and any CVC.

## 🌟 Highlights

* **Multi-seller marketplace** with public storefronts, a seller directory and "Sold by" attribution.
* **Single checkout across sellers**, paid through Stripe and confirmed by a signature-verified webhook.
* **Three roles** — customer, vendor, admin — enforced by Row Level Security in the database, not just in the UI.
* **Full shopping cycle:** discovery, cart, promo codes, shipping, payment, order tracking, invoices and reviews.
* **Bilingual (ES/EN) and multi-currency (MXN/USD)**, with the amount Stripe charges derived from the same exchange rate shown on screen.
* **Operations tooling:** inventory with audit trail, promotions, analytics, support inbox and user/role management.

## ✨ Features

### Marketplace
* **Seller businesses.** Each seller has a business profile (name, description, logo, banner) and a public storefront at `/negocio/[slug]`, plus a directory at `/negocios`. One business per owner, enforced by a unique constraint.
* **Admin-run onboarding.** A student signs up normally; an administrator then creates their business from `/admin/negocios`, which promotes the account to the `vendor` role in the same step. Admins cannot be picked as owners (it would silently demote them).
* **Seller self-service.** A vendor edits their own branding from `/admin/mi-negocio`. The permission is enforced by Row Level Security — a vendor cannot touch another business even by calling the database directly.
* **"Sold by" attribution.** Product pages show which business sells the item and link to its storefront.
* **Pause a seller.** Deactivating a business hides its storefront *and* removes its products from the home page, category pages, search and best-sellers.
* **One checkout across sellers.** A cart can mix products from several businesses and is paid in a single Stripe session, producing one order. Each seller sees only the orders that contain their items.

### Shopping experience
* **Category-aware catalog.** Products carry category-specific attributes (brand/model for electronics, material/gender for apparel, dimensions for home goods) stored as JSONB and rendered dynamically in both the seller form and the product page.
* **Discovery.** Live search, category pages with filters and sorting, featured / new / best-seller sections, related products, wishlist, size guide and variant (size/color) selection with per-variant stock.
* **Cart and checkout.** Persistent cart, guest and authenticated checkout, promo codes, shipping calculation (free above a configurable threshold, flat rate below it) and a printable receipt/invoice.
* **Orders and follow-up.** Order history, order detail with a status stepper (pending → paid → fulfilled), tracking number, and a "leave a review" prompt once an order ships.
* **Reviews.** 1–5 star ratings with title and comment, one review per customer per product, average rating on the product page.
* **Customer service.** Contact form feeding an admin inbox, and a help center with FAQ and shipping/returns information.
* **Bilingual and multi-currency.** ES/EN interface (next-intl) and a MXN/USD switcher that recalculates every displayed price *and* the amount Stripe charges.

### Operations
* **Inventory.** Per-variant stock, low-stock alerts, automatic decrement on payment and an inventory-movement audit trail.
* **Promotions.** Percentage or fixed-amount codes with minimum order, usage limit and expiry; validated server-side and applied through an ephemeral Stripe coupon.
* **Analytics.** Revenue by day, top products, paid orders and average ticket.
* **User and role management.** Admins list every user (with email) and change roles from `/admin/usuarios`; an admin cannot change their own role.

### Security
* **Row Level Security everywhere.** Every table has RLS; the policies decide who can read or change what (admin / vendor / customer scoping on products, orders, inventory, businesses).
* **Server-authoritative money.** Prices, shipping, discounts and currency conversion are recomputed on the server from the database before a Stripe session is created; the client only chooses *what* to buy.
* **Signature-verified, idempotent webhook.** Orders are written only from a Stripe webhook whose signature is verified, and a replayed event cannot create a duplicate order.
* **Test-mode lock** on the Stripe client, plus a CSP and standard security headers on every route.
* **Least privilege.** The service-role key is used in only a few narrow places (webhook, order lookup by Stripe session, promo-code validation, sitewide best-seller rollup); user listing with emails goes through a `SECURITY DEFINER` function restricted to admins.
* **Secrets hygiene.** `.env*` and key/certificate formats are git-ignored, and the git history was audited for leaked secrets.

## 🎓 Mapping to the course material

### Participants of an operation

| Participant | In Omnara |
| --- | --- |
| **Cliente** — searches and buys | Customers, guest or registered |
| **Empresa** — offers products | Seller businesses (`vendor` role + `businesses` table) |
| **Plataforma** — makes the operation possible | This Next.js application and its admin panel |
| **Proveedor de pagos** — processes/authorizes payment | Stripe Checkout (test mode) |
| **Logística** — storage, shipping, delivery | Shipping cost, address capture and tracking number |
| **Proveedor tecnológico** — hosting, infrastructure, software | Vercel (hosting) and Supabase (database, auth, storage) |

### Platform functions

| Function | Where it lives |
| --- | --- |
| Catálogo de productos | Category pages, product pages, search, storefronts |
| Cuentas de clientes | Supabase Auth: sign-up, login, password recovery, `/cuenta` |
| Carrito de compra | Zustand store persisted in the browser |
| Gestión de pedidos | Orders, status, tracking, invoices, admin/vendor views |
| Inventario | Variant stock, low-stock alerts, movement audit trail |
| Pagos | Stripe Checkout + webhook |
| Promociones | Promo codes (admin-managed) |
| Atención al cliente | Contact inbox, help center |

### What happens when a product is added to the cart

| Step in the course flow | Implementation |
| --- | --- |
| Customer selects the product | Variant picker on the product page |
| Platform registers the selection | `useCartStore` (Zustand, `localStorage`) |
| Product information is looked up | Data comes from Supabase through server queries |
| Availability is verified | Quantity is capped to the variant's stock when adding; stock is re-checked server-side at checkout |
| Cart is updated | Cart page: quantity stepper, remove, empty state |
| Amount is calculated | Subtotal client-side for display; the charged amount is always recomputed on the server |

The key point of that slide — *information must stay synchronized between the interface, the server and the database* — is why the client never decides a price: the cart is a convenience, the server is the source of truth.

### The payment process

`Customer data → e-commerce platform → payment gateway (Stripe) → financial institution → authorization or rejection → confirmation to the store`

The last step is the one the course flags as essential ("the store needs to know the outcome to continue the order"). Omnara handles it with a **signature-verified Stripe webhook** that creates the order, decrements stock and records the audit trail. The confirmation page polls briefly for the order because the webhook is asynchronous, and uses the Stripe session id as proof of ownership so guest buyers can see their receipt.

### Front-end and back-end

| Front-end = interaction | Back-end = processing |
| --- | --- |
| Home, catalog, product pages | Next.js server components, server actions and the Stripe webhook route |
| Cart, forms, buttons | Supabase Postgres (data, auth, storage) with RLS |
| Seller and admin panels | Inventory, orders, users, payments |

### Advantages and challenges of e-commerce

| Challenge | How Omnara addresses it |
| --- | --- |
| Seguridad informática | RLS, CSP and security headers, server-side validation, least-privilege keys |
| Fraudes | Payment handled entirely by Stripe; webhook signature verification; test-mode lock |
| Protección de datos personales | Data minimized to name/email/address; RLS keeps it scoped to the owner |
| Competencia | Several sellers share one catalog, search and checkout |
| Logística | Shipping cost, address snapshot and tracking number on every order |
| Devoluciones | Returns policy and process documented in the help center |
| Confianza del consumidor | Reviews and average rating, public seller storefronts |
| Disponibilidad / dependencia tecnológica | Managed hosting on Vercel and Supabase |
| Costos de envío | Configurable free-shipping threshold and flat rate |
| Cumplimiento legal | Terms and privacy pages |
| Experiencia de usuario | Responsive, bilingual, accessible focus states, reduced-motion support |

## 🔭 Future work

Omnara is a complete teaching marketplace. Natural next steps if it were taken toward production:

* Verified-purchase reviews, seller ratings and moderation.
* Self-service seller applications with identity verification.
* Product comparison across sellers.
* Return/refund and dispute workflow.
* Per-seller orders and payouts with Stripe Connect and a platform commission.
* Carrier integration and email notifications.
* Rate limiting / CAPTCHA, automated tests and schema migrations versioned in the repository.

## 🛠 Technologies Used

* **Framework:** Next.js 16 (App Router), React 19
* **Language:** TypeScript
* **Styling:** Tailwind CSS v4, shadcn/ui (Base UI primitives)
* **Backend:** Supabase (Postgres, Auth, Storage, Row Level Security)
* **Payments:** Stripe (test mode, safety-locked)
* **State & data:** Zustand, TanStack Query
* **i18n:** next-intl (`/es`, `/en`)
* **Hosting:** Vercel + Supabase

> Next.js 16 renames `middleware.ts` to `src/proxy.ts`. `AGENTS.md` points to the bundled docs in `node_modules/next/dist/docs/` before writing framework code.

## 🚀 Installation & Setup

You need Node.js 20+ and a Supabase project.

1. **Clone and install**
   ```bash
   git clone https://github.com/jp-software-dev/omnara-ecommerce.git
   cd omnara-ecommerce
   npm install
   ```

2. **Create `.env.local`** in the project root (it is git-ignored):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   STRIPE_SECRET_KEY=
   STRIPE_WEBHOOK_SECRET=
   ```

   | Variable | Needed for |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything that reads or writes data |
   | `SUPABASE_SERVICE_ROLE_KEY` | Promo-code validation, best-sellers, Stripe webhook, order confirmation. **Server-only: never expose it to the browser.** |
   | `STRIPE_SECRET_KEY` | Checkout. Must be a test key (`sk_test_…`) or the app refuses to start Stripe. |
   | `STRIPE_WEBHOOK_SECRET` | Verifying webhook signatures so orders can be created |

3. **Forward Stripe webhooks** while developing (Stripe CLI), and copy the signing secret it prints into `STRIPE_WEBHOOK_SECRET`:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

4. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (it redirects to `/es`).

5. **Create the first administrator.** Sign up through `/es/signup`, confirm the email, then promote the account in the Supabase SQL editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-user-id>';
   ```

6. **Onboard a seller.** Have the student sign up, then in `/admin/negocios` pick them as owner and fill in the business details. Their account becomes a vendor automatically and they can manage products from `/admin/productos`.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |

> **Note:** the database schema (tables, RLS policies, the `admin_list_users()` function) lives in the Supabase project rather than in migration files in this repository, so a fresh clone connects to an existing Supabase project instead of recreating one.

## 🗂 Project documentation by stage

The course ties each stage of the software lifecycle to a document. For Omnara:

| Stage | Document | Where |
| --- | --- | --- |
| Necesidad / Requisitos | Functional scope | *Features* in this README |
| Diseño | Architecture and data model | *Technologies Used* above; schema in Supabase |
| Desarrollo | Technical documentation | Code comments where the reason is non-obvious; `AGENTS.md` |
| Pruebas | Results and incidents | Pull request test plans and code-review findings on GitHub |
| Implementación | Installation manual | *Installation & Setup* above |
| Mantenimiento | Change log | Git history and merged pull requests |
