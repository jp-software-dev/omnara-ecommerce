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

* **Multi-seller marketplace**: sellers apply, an administrator approves them, and each gets a public storefront, a product/inventory panel and its own orders, returns and analytics.
* **Single checkout across sellers**, paid through Stripe and confirmed by a signature-verified webhook; each seller ships and tracks **their own items**.
* **Trust built in**: reviews only from real buyers (with a database-computed *Verified purchase* badge), seller ratings, public questions and answers, side-by-side product comparison, and a return / refund / dispute flow.
* **Three roles** — customer, vendor, admin — enforced by Row Level Security in the database, not just in the UI.
* **Bilingual (ES/EN) and multi-currency (MXN/USD)**, with the amount Stripe charges derived from the same exchange rate shown on screen.
* **Security and privacy**: server-side validation, an append-only admin audit log, CAPTCHA-ready forms, a rate-limited contact form, real terms and privacy notice, data export and deletion requests.
* **Quality**: unit tests, CI on every pull request, and the SQL of every database change versioned in `supabase/migrations`.

## ✨ Features

### Marketplace
* **Seller applications.** Anyone can apply at `/vender` with their business details and an identity document (kept in a private bucket only admins can read). An admin reviews it at `/admin/solicitudes` and approves with an editable slug or rejects with a reason; approval promotes the user, creates the business and closes the application in a single transaction.
* **Storefronts.** Each business has a public page at `/negocio/[slug]`, a directory at `/negocios`, a logo and banner it uploads itself, and a **seller rating** (the average of the visible reviews of its products).
* **Product management.** Vendors create products, upload images (cover image, delete) and add or remove variants (SKU, size, color, price override, stock) from the product page — no SQL involved.
* **Sold-by everywhere.** Product cards and pages say who sells each item; category pages can be **filtered by seller** and search also matches **business names**.
* **Pause a seller.** Deactivating a business hides its storefront and removes its products from the home page, categories, search and best-sellers.
* **One checkout across sellers.** A cart can mix businesses and is paid once, producing one order; each seller sees only the orders that contain their items.

### Shopping experience
* **Category-aware catalog**, live search, filters and sorting, featured / new / best-seller sections, related products, wishlist, size guide and variant selection with per-variant stock.
* **Product comparison.** Up to four products side by side (best price highlighted, seller, rating, sizes and colors in stock, specifications), and a *Compare with other businesses* block on each product page (same category, different seller).
* **Cart and checkout.** Persistent cart, guest and signed-in checkout, promo codes, shipping calculation and a printable receipt. Signed-in buyers keep an **address book** (`/cuenta/direcciones`) and pick a saved address at checkout.
* **Orders.** Order history with a status stepper, and **per-item shipping and tracking** shown on the receipt.
* **Returns, refunds and disputes.** A buyer can return a shipped item within 30 days; the seller approves or rejects; a rejection can be escalated to Omnara; the admin refunds through Stripe. Buyer, seller and admin talk in a shared thread, and the refund amount is computed in the database (item price minus its share of any discount; shipping excluded).
* **Reviews and questions.** Only buyers can review a product, and the badge is set by the database, never by the client. Anyone signed in can ask the seller a public question. Admins can hide a review or question without deleting it.
* **Customer service.** Contact form feeding an admin inbox, and a help center.
* **Bilingual and multi-currency.** ES/EN interface (including login and signup) and a MXN/USD switcher that recalculates every price and the amount Stripe charges.

### Operations
* **Inventory** per variant, low-stock alerts, automatic decrement on payment and a movement audit trail.
* **Promotions** (percentage or fixed codes with minimum, limit and expiry) validated on the server and applied through an ephemeral Stripe coupon.
* **Analytics** for admins and for each vendor: product sales by day, top products, paid orders and average order, computed from the seller's own items (USD sales converted to MXN at the current rate).
* **Email notifications** (order confirmation, new sale, item shipped, return updates, disputes, seller application decisions), queued by database triggers and sent through Resend; admins can inspect the queue at `/admin/correos`.
* **Users, roles and moderation**: user and role management, review and question moderation, and a returns inbox.

### Security and privacy
* **Row Level Security everywhere**; every sensitive write (returns, applications, questions, moderation, data requests) goes through a `SECURITY DEFINER` function that checks who is calling.
* **Server-authoritative money**: prices, shipping, discounts, refunds and currency conversion are recomputed on the server; the client only chooses *what* to buy.
* **Signature-verified, idempotent Stripe webhook**, **test-mode lock** on the Stripe client, idempotent refunds, and a CSP plus standard security headers.
* **Server-side validation** (zod) on products, businesses, promo codes, variants, addresses, returns, questions and the contact form.
* **Abuse protection**: the contact form only accepts messages through a database function that validates and throttles (3 per address and 40 in total per hour) plus a honeypot; login, signup, recovery and contact are **CAPTCHA-ready** (Cloudflare Turnstile, off until configured).
* **Admin audit log** (`/admin/bitacora`): who changed which fields, written by triggers, append-only and without copying personal data.
* **Privacy**: real terms of service and privacy notice (ES/EN), a personal data export (`/cuenta/privacidad`) and account deletion requests handled by an admin.
* **Least privilege and secrets hygiene**: the service-role key is used in a few narrow places; `.env*` and key formats are git-ignored.

## 🎓 Mapping to the course material

### Participants of an operation

| Participant | In Omnara |
| --- | --- |
| **Cliente** — searches and buys | Customers, guest or registered |
| **Empresa** — offers products | Seller businesses (`vendor` role + `businesses` table) |
| **Plataforma** — makes the operation possible | This Next.js application and its admin panel |
| **Proveedor de pagos** — processes/authorizes payment | Stripe Checkout (test mode) |
| **Logística** — storage, shipping, delivery | Shipping cost, address book, per-seller shipping and tracking numbers |
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
| Reseñas y reputación | Verified reviews, seller ratings, questions, comparison |
| Devoluciones y reembolsos | Return requests, disputes, Stripe refunds |
| Notificaciones | Transactional emails |
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
| Seguridad informática | RLS, CSP, server-side validation, least-privilege keys, abuse throttling, CAPTCHA-ready forms, admin audit log |
| Fraudes | Payment handled by Stripe, webhook signature verification, test-mode lock; sellers are vetted with an identity document before they can sell |
| Protección de datos personales | Data minimized, RLS scopes it to its owner, private bucket for identity documents, data export and deletion requests, privacy notice |
| Competencia | Several sellers share one catalog; product comparison, seller ratings and filters help shoppers choose |
| Logística | Shipping cost, address book and snapshot, per-seller shipping with tracking and email notices (no carrier integration yet) |
| Devoluciones | 30-day return flow with seller decision, dispute escalation and Stripe refunds |
| Confianza del consumidor | Verified-purchase reviews, seller ratings, questions and answers, moderation, public storefronts |
| Disponibilidad / dependencia tecnológica | Managed hosting on Vercel and Supabase |
| Costos de envío | Configurable free-shipping threshold and flat rate |
| Cumplimiento legal | Real terms of service and privacy notice (written as a student project; review with a lawyer before real use) |
| Experiencia de usuario | Responsive, bilingual, accessible focus states, reduced-motion support |

## 🔭 Future work

Omnara is a complete teaching marketplace. Known limits and next steps if it were taken toward production:

* **Per-seller payouts** with Stripe Connect and a platform commission: today one cart is one order and the money is not split.
* **Carrier integration** and shipping priced per seller or by weight.
* **Comparison of the exact same item** across sellers: products have no shared catalogue code (GTIN/model), so "similar" means same category and a different seller.
* **Restocking on returns** is not automatic, and sellers can't yet respond to a dispute with attachments.
* **Google sign-in** (needs credentials from Google Cloud and Supabase) — the button is still a placeholder.
* **Automated tests beyond unit level**: database rules were verified with SQL scripts and are not part of CI, and there are no browser (end-to-end) tests.
* **A complete schema export**: `supabase/migrations` holds every change made in this project's later phases, but the original tables and policies were created directly in Supabase, so a fresh clone still can't rebuild the whole database by itself.

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
   # Optional — features stay inert until they are set:
   RESEND_API_KEY=
   EMAIL_FROM=
   CRON_SECRET=
   NEXT_PUBLIC_SITE_URL=
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=
   TURNSTILE_SECRET_KEY=
   ```

   | Variable | Needed for |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Everything that reads or writes data |
   | `SUPABASE_SERVICE_ROLE_KEY` | Promo-code validation, best-sellers, Stripe webhook, order confirmation. **Server-only: never expose it to the browser.** |
   | `STRIPE_SECRET_KEY` | Checkout. Must be a test key (`sk_test_…`) or the app refuses to start Stripe. |
   | `STRIPE_WEBHOOK_SECRET` | Verifying webhook signatures so orders can be created |
   | `RESEND_API_KEY`, `EMAIL_FROM` | Sending notification emails. Without them emails are queued and `/admin/correos` says so. |
   | `CRON_SECRET` | Protects `/api/cron/send-emails`, a safety net that re-sends queued emails. |
   | `NEXT_PUBLIC_SITE_URL` | Base URL used for links inside emails. |
   | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile CAPTCHA. Also enable CAPTCHA protection in the Supabase dashboard (Authentication → Attack Protection) with the same secret, and turn on leaked-password protection there. |

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
| `npm run typecheck` | TypeScript type check |
| `npm test` | Unit tests (Vitest) |

> **Database:** every schema change made after the initial tables is versioned as SQL in `supabase/migrations` (applied to the Supabase project in order). The original tables and policies were created directly in Supabase and are not exported yet, so a fresh clone connects to an existing Supabase project instead of recreating one.

## 🗂 Project documentation by stage

The course ties each stage of the software lifecycle to a document. For Omnara:

| Stage | Document | Where |
| --- | --- | --- |
| Necesidad / Requisitos | Functional scope | *Features* in this README and `docs/DOCUMENTACION_FUNCIONAL` |
| Diseño | Architecture and data model | *Technologies Used* above; schema in Supabase |
| Desarrollo | Technical documentation | `docs/DOCUMENTACION_TECNICA`; code comments where the reason is non-obvious; `AGENTS.md` |
| Pruebas | Results and incidents | Unit tests (`npm test`), the CI check on every pull request, and the test plan in each pull request |
| Implementación | Installation manual | *Installation & Setup* above |
| Mantenimiento | Change log | Git history and merged pull requests |
