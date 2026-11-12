import { pickLocale, formatPrice } from "@/lib/format";
import { getSalesAnalytics, getOrderStatusCounts } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { SimpleBarChart } from "@/components/admin/simple-bar-chart";

export default async function AdminAnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { role } = await requireRole(["admin", "vendor"], locale);

  const [sales, statusCounts] = await Promise.all([getSalesAnalytics(30), getOrderStatusCounts()]);
  const { revenueByDay, topProducts, paidOrders, avgOrderCents, totalCents: totalRevenueCents } = sales;
  const totalOrders = [...statusCounts.values()].reduce((sum, n) => sum + n, 0);

  const t = {
    title: locale === "en" ? "Analytics" : "Analítica",
    revenue30d: locale === "en" ? "Product sales (30d)" : "Ventas de productos (30d)",
    orders30d: locale === "en" ? "Paid orders (30d)" : "Pedidos pagados (30d)",
    avgOrder: locale === "en" ? "Average order" : "Ticket promedio",
    revenueChart: locale === "en" ? "Revenue by day" : "Ingresos por día",
    topProducts: locale === "en" ? "Top products (30d)" : "Productos más vendidos (30d)",
    scope:
      role === "vendor"
        ? locale === "en"
          ? "Only items sold by your business. Shipping and discounts are not included; USD sales are converted to MXN at the current rate."
          : "Solo artículos vendidos por tu negocio. No incluye envío ni descuentos; las ventas en USD se convierten a MXN al tipo de cambio actual."
        : locale === "en"
          ? "Product sales across all businesses. Shipping and discounts are not included; USD sales are converted to MXN at the current rate."
          : "Ventas de productos de todos los negocios. No incluye envío ni descuentos; las ventas en USD se convierten a MXN al tipo de cambio actual.",
    units: locale === "en" ? "units" : "unidades",
    noData: locale === "en" ? "Not enough data yet." : "Todavía no hay suficientes datos.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.scope}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">{t.revenue30d}</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(totalRevenueCents, "MXN", locale)}</p>
        </div>
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">{t.orders30d}</p>
          <p className="mt-1 text-2xl font-semibold">{paidOrders}</p>
        </div>
        <div className="rounded-lg border p-5">
          <p className="text-sm text-muted-foreground">{t.avgOrder}</p>
          <p className="mt-1 text-2xl font-semibold">{formatPrice(avgOrderCents, "MXN", locale)}</p>
        </div>
      </div>

      <div className="mt-6 rounded-lg border p-5">
        <p className="mb-4 text-sm font-medium">{t.revenueChart}</p>
        {totalRevenueCents > 0 ? (
          <SimpleBarChart
            data={revenueByDay.map((d) => ({ label: d.day, value: d.totalCents }))}
            formatValue={(v) => formatPrice(v, "MXN", locale)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{t.noData}</p>
        )}
      </div>

      <div className="mt-6 rounded-lg border p-5">
        <p className="mb-4 text-sm font-medium">{t.topProducts}</p>
        {topProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noData}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {topProducts.map((product, index) => (
              <li key={index} className="flex items-center justify-between text-sm">
                <span>{pickLocale(product.name, locale) || "Producto"}</span>
                <span className="text-muted-foreground">
                  {product.units} {t.units} · {formatPrice(product.revenueCents, "MXN", locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{totalOrders} {locale === "en" ? "orders total" : "pedidos en total"}</p>
    </main>
  );
}
