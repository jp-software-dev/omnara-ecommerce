import {
  LayoutDashboard,
  Package,
  Boxes,
  ClipboardList,
  BarChart3,
  Mail,
  Tag,
  Users,
  Store,
  UserCheck,
  Undo2,
  MessageSquareWarning,
  CircleHelp,
  Send,
  ScrollText,
  ShieldCheck,
  Wallet,
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
    { href: "/admin/devoluciones", label: locale === "en" ? "Returns" : "Devoluciones", icon: Undo2 },
    { href: "/admin/preguntas", label: locale === "en" ? "Questions" : "Preguntas", icon: CircleHelp },
    { href: "/admin/analitica", label: locale === "en" ? "Analytics" : "Analítica", icon: BarChart3 },
    { href: "/admin/pagos", label: locale === "en" ? "Payouts" : "Pagos", icon: Wallet },
    ...(role === "vendor"
      ? [{ href: "/admin/mi-negocio", label: locale === "en" ? "My business" : "Mi negocio", icon: Store }]
      : []),
    ...(role === "admin"
      ? [
          { href: "/admin/mensajes", label: locale === "en" ? "Messages" : "Mensajes", icon: Mail },
          {
            href: "/admin/promociones",
            label: locale === "en" ? "Promo codes" : "Promociones",
            icon: Tag,
          },
          { href: "/admin/usuarios", label: locale === "en" ? "Users" : "Usuarios", icon: Users },
          { href: "/admin/negocios", label: locale === "en" ? "Businesses" : "Negocios", icon: Store },
          {
            href: "/admin/resenas",
            label: locale === "en" ? "Reviews" : "Reseñas",
            icon: MessageSquareWarning,
          },
          { href: "/admin/correos", label: locale === "en" ? "Emails" : "Correos", icon: Send },
          { href: "/admin/bitacora", label: locale === "en" ? "Audit log" : "Bitácora", icon: ScrollText },
          { href: "/admin/privacidad", label: locale === "en" ? "Data requests" : "Solicitudes de datos", icon: ShieldCheck },
          {
            href: "/admin/solicitudes",
            label: locale === "en" ? "Applications" : "Solicitudes",
            icon: UserCheck,
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
