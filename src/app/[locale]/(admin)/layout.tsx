import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  BarChart3,
  Mail,
  Tag,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/supabase/auth-helpers";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { role } = await requireRole(["admin", "vendor"], locale);

  const nav = [
    { href: "/admin", label: locale === "en" ? "Overview" : "Resumen", icon: LayoutDashboard },
    { href: "/admin/productos", label: locale === "en" ? "Products" : "Productos", icon: Package },
    { href: "/admin/inventario", label: locale === "en" ? "Inventory" : "Inventario", icon: Boxes },
    { href: "/admin/pedidos", label: locale === "en" ? "Orders" : "Pedidos", icon: ClipboardList },
    { href: "/admin/analitica", label: locale === "en" ? "Analytics" : "Analítica", icon: BarChart3 },
    ...(role === "admin"
      ? [
          { href: "/admin/mensajes", label: locale === "en" ? "Messages" : "Mensajes", icon: Mail },
          {
            href: "/admin/promociones",
            label: locale === "en" ? "Promo codes" : "Promociones",
            icon: Tag,
          },
        ]
      : []),
  ];

  return (
    <div className="flex min-h-svh flex-1">
      <aside className="hidden w-56 shrink-0 border-r p-4 md:block">
        <p className="mb-4 px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {role === "admin" ? "Admin" : locale === "en" ? "Vendor panel" : "Panel de vendedor"}
        </p>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
