# Database migrations

SQL of every schema change to Omnara's database, in the order it was applied.
Apply the files **in filename order** to an empty Supabase project to rebuild the schema.

## What is here

| Files | What they are |
| --- | --- |
| `20260805…` – `20260924…` | The **original schema**, exported byte-for-byte from the project's migration history (each file's hash was checked against the SQL stored in Supabase): core tables, RLS and policies, the `private` helper functions, the `product-images` bucket, orders fixes, contact messages, `admin_list_users`, `businesses`. |
| `20261110…` – `20261112…` | Everything added in the later phases (vendor uploads and shipping, verified reviews, seller applications, returns, moderation, ratings, Q&A, seller FK, email notifications, saved addresses, contact limits, audit log, data requests). |

## What is NOT here, on purpose

* **Other applications' migrations.** This Supabase project is shared: besides Omnara (`public` schema) it also hosts the `textiles` and `mediagenda` schemas, and they share one migration-history table. Their migrations (`mediagenda_*`, `textiles_*`, `funciones_admin`, `respaldo_lectura_secuencias`) belong to those projects and are not copied here.
* **Demo catalogue data.** Three migrations seeded about 50 demo products (`seed_more_products_*`, ~40 KB of `INSERT`s) and a temporary storage policy that was added and dropped (`add_temp_seed_storage_policy`, `drop_temp_seed_storage_policy`, net effect none). A rebuilt database starts with an empty catalogue; the two demo promo codes and the default warehouse are included.

## Things to know

* The files from `20261110…` onward were saved with their own ordering timestamps, which are **not identical** to the version numbers Supabase recorded when each change was applied. Do not feed this folder to `supabase db push` against the existing project, or it will try to re-apply changes that are already there. Use it to rebuild a fresh project.
* Some later files depend on objects created by earlier ones (for example the `private.is_admin()` helper), so the order matters.
* The first administrator is created by hand (see the main README).
