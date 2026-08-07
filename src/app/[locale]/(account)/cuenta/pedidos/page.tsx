import { PackageOpen } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getUserOrders } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/format";

const STATUS_LABELS: Record<string, { es: string; en: string }> = {
  pending: { es: "Pendiente", en: "Pending" },
  paid: { es: "Pagado", en: "Paid" },
  fulfilled: { es: "Enviado", en: "Fulfilled" },
  cancelled: { es: "Cancelado", en: "Cancelled" },
  refunded: { es: "Reembolsado", en: "Refunded" },
};

export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const orders = await getUserOrders(user.id);

  const t = {
    title: locale === "en" ? "My orders" : "Mis pedidos",
    empty: locale === "en" ? "You haven't placed any orders yet." : "Todavía no has hecho ningún pedido.",
    browse: locale === "en" ? "Browse products" : "Ver productos",
    items: (n: number) => (locale === "en" ? `${n} item${n === 1 ? "" : "s"}` : `${n} artículo${n === 1 ? "" : "s"}`),
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      {orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <PackageOpen className="size-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t.empty}</p>
          <Link href="/" className="text-sm font-medium underline underline-offset-4">
            {t.browse}
          </Link>
        </div>
      ) : (
        <ul className="mt-6 divide-y">
          {orders.map((order) => {
            const label = STATUS_LABELS[order.status];
            const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
            return (
              <li key={order.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-MX")}
                    {" · "}
                    {t.items(itemCount)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {label ? label[locale === "en" ? "en" : "es"] : order.status}
                  </Badge>
                  <span className="font-medium">
                    {formatPrice(order.total_cents, order.currency === "USD" ? "USD" : "MXN", locale)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
