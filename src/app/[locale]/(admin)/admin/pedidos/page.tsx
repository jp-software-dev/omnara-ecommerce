import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { getOrdersForRole } from "@/lib/supabase/admin-queries";
import { createClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/format";
import { OrderStatusSelect } from "./order-status-select";

const STATUS_LABELS: Record<string, { es: string; en: string }> = {
  pending: { es: "Pendiente", en: "Pending" },
  paid: { es: "Pagado", en: "Paid" },
  fulfilled: { es: "Enviado", en: "Fulfilled" },
  cancelled: { es: "Cancelado", en: "Cancelled" },
  refunded: { es: "Reembolsado", en: "Refunded" },
};

export default async function AdminOrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  const isAdmin = profile?.role === "admin";

  const orders = await getOrdersForRole();

  const labels = Object.fromEntries(
    Object.entries(STATUS_LABELS).map(([key, value]) => [key, value[locale === "en" ? "en" : "es"]])
  );

  const t = {
    title: locale === "en" ? "Orders" : "Pedidos",
    order: locale === "en" ? "Order" : "Pedido",
    items: locale === "en" ? "Items" : "Artículos",
    total: locale === "en" ? "Total" : "Total",
    status: locale === "en" ? "Status" : "Estado",
    empty: locale === "en" ? "No orders yet." : "Todavía no hay pedidos.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      {orders.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="mt-6 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.order}</TableHead>
                <TableHead>{t.items}</TableHead>
                <TableHead>{t.total}</TableHead>
                <TableHead>{t.status}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const itemCount = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/pedidos/${order.id}`} className="hover:underline">
                        {order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{itemCount}</TableCell>
                    <TableCell>
                      {formatPrice(order.total_cents, order.currency === "USD" ? "USD" : "MXN", locale)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusSelect
                        orderId={order.id}
                        initialStatus={order.status}
                        labels={labels}
                        disabled={!isAdmin}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
