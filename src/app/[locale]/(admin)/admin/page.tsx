import { Package, ClipboardList, AlertTriangle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getAdminProducts, getLowStockVariants, getOrdersForRole } from "@/lib/supabase/admin-queries";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [products, orders, lowStock] = await Promise.all([
    getAdminProducts(),
    getOrdersForRole(),
    getLowStockVariants(),
  ]);

  const t = {
    title: "Admin",
    products: locale === "en" ? "Products" : "Productos",
    orders: locale === "en" ? "Orders" : "Pedidos",
    lowStock: locale === "en" ? "Low stock alerts" : "Alertas de stock bajo",
  };

  const cards = [
    { label: t.products, value: products.length, href: "/admin/productos", icon: Package },
    { label: t.orders, value: orders.length, href: "/admin/pedidos", icon: ClipboardList },
    { label: t.lowStock, value: lowStock.length, href: "/admin/inventario", icon: AlertTriangle },
  ];

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="flex flex-col gap-2 rounded-lg border p-5 hover:bg-muted/50"
          >
            <card.icon className="size-5 text-muted-foreground" />
            <p className="text-2xl font-semibold">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
