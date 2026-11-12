import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatPrice, pickLocale } from "@/lib/format";
import { reasonLabel, statusLabel } from "@/lib/returns";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { getReturnsForRole } from "@/lib/supabase/queries";

export default async function AdminReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  const { role, user } = await requireRole(["admin", "vendor"], locale);

  const returns = await getReturnsForRole(role === "admin" ? "admin" : "vendor", user.id);

  // What needs a decision from THIS person comes first.
  const awaitingMe = (status: string) =>
    role === "admin"
      ? status === "escalated" || status === "approved"
      : status === "requested";
  const sorted = [...returns].sort(
    (a, b) => Number(awaitingMe(b.status)) - Number(awaitingMe(a.status))
  );

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{en ? "Returns" : "Devoluciones"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {role === "admin"
          ? en
            ? "Disputes and approved returns waiting for a refund come first."
            : "Primero las disputas y las devoluciones aprobadas que esperan reembolso."
          : en
            ? "Returns requested for your items. Those waiting for your decision come first."
            : "Devoluciones solicitadas de tus artículos. Primero las que esperan tu decisión."}
      </p>

      {sorted.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {en ? "There are no returns yet." : "Todavía no hay devoluciones."}
        </p>
      ) : (
        <ul className="mt-6 max-w-3xl divide-y rounded-lg border">
          {sorted.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/devoluciones/${item.id}`}
                className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">
                    {item.order_items ? pickLocale(item.order_items.product_name_snapshot, locale) : "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {item.orders?.order_number} · {reasonLabel(item.reason, locale)} ·{" "}
                    {formatPrice(item.refund_amount_cents, item.currency === "USD" ? "USD" : "MXN", locale)}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {awaitingMe(item.status) ? (
                    <span className="size-2 rounded-full bg-primary" aria-label={en ? "Needs action" : "Requiere acción"} />
                  ) : null}
                  <Badge variant={item.status === "refunded" ? "default" : "secondary"}>
                    {statusLabel(item.status, locale)}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
