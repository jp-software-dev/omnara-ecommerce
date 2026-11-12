import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getAuditLog } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import type { Json } from "@/lib/supabase/types";

const TABLES: Record<string, { es: string; en: string }> = {
  products: { es: "Productos", en: "Products" },
  categories: { es: "Categorías", en: "Categories" },
  businesses: { es: "Negocios", en: "Businesses" },
  promo_codes: { es: "Códigos promocionales", en: "Promo codes" },
  app_settings: { es: "Configuración", en: "Settings" },
  profiles: { es: "Roles de usuario", en: "User roles" },
  orders: { es: "Pedidos", en: "Orders" },
  reviews: { es: "Reseñas", en: "Reviews" },
  product_questions: { es: "Preguntas", en: "Questions" },
  seller_applications: { es: "Solicitudes de vendedor", en: "Seller applications" },
  return_requests: { es: "Devoluciones", en: "Returns" },
};

const ACTIONS: Record<string, { es: string; en: string }> = {
  INSERT: { es: "Creó", en: "Created" },
  UPDATE: { es: "Modificó", en: "Changed" },
  DELETE: { es: "Eliminó", en: "Deleted" },
};

const short = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 60 ? `${text.slice(0, 57)}…` : text;
};

// UPDATE rows hold {column: {from, to}}; INSERT/DELETE hold the row itself.
function describe(action: string, changes: Json, en: boolean): string[] {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) return [];
  const record = changes as Record<string, unknown>;
  if (action === "UPDATE") {
    return Object.entries(record).map(([column, diff]) => {
      const { from, to } = (diff ?? {}) as { from?: unknown; to?: unknown };
      return `${column}: ${short(from)} → ${short(to)}`;
    });
  }
  const label = record.name ?? record.slug ?? record.code ?? "";
  const name =
    label && typeof label === "object"
      ? ((label as Record<string, string>)[en ? "en" : "es"] ?? "")
      : String(label);
  return name ? [name] : [];
}

export default async function AdminAuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { locale } = await params;
  const { t: tableFilter } = await searchParams;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const table = tableFilter && TABLES[tableFilter] ? tableFilter : undefined;
  const entries = await getAuditLog(table);

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{en ? "Audit log" : "Bitácora de cambios"}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {en
          ? "Changes made by administrators. It only shows which fields changed, and it can't be edited or deleted."
          : "Cambios hechos por administradores. Solo muestra qué campos cambiaron y no se puede editar ni borrar."}
      </p>

      <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label={en ? "Filter" : "Filtrar"}>
        <Link
          href="/admin/bitacora"
          className={`rounded-full border px-3 py-1 ${table ? "" : "border-primary text-primary"}`}
        >
          {en ? "All" : "Todo"}
        </Link>
        {Object.entries(TABLES).map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/bitacora?t=${key}`}
            className={`rounded-full border px-3 py-1 ${table === key ? "border-primary text-primary" : ""}`}
          >
            {label[en ? "en" : "es"]}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {en ? "Nothing has been recorded yet." : "Todavía no hay cambios registrados."}
        </p>
      ) : (
        <ul className="mt-6 max-w-4xl divide-y rounded-lg border text-sm">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex flex-wrap items-center gap-2">
                  <Badge variant={entry.action === "DELETE" ? "destructive" : "secondary"}>
                    {(ACTIONS[entry.action] ?? ACTIONS.UPDATE)[en ? "en" : "es"]}
                  </Badge>
                  <span className="font-medium">{TABLES[entry.table_name]?.[en ? "en" : "es"] ?? entry.table_name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{entry.record_id.slice(0, 8)}</span>
                </span>
                <span className="text-muted-foreground">
                  {entry.profiles?.full_name ?? (en ? "Unknown admin" : "Admin desconocido")} ·{" "}
                  {new Date(entry.created_at).toLocaleString(en ? "en-US" : "es-MX")}
                </span>
              </div>
              <ul className="mt-1 space-y-0.5 font-mono text-xs text-muted-foreground">
                {describe(entry.action, entry.changes, en).map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
