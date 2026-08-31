import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getPromoCodes } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { formatPrice } from "@/lib/format";
import { PromoCodeForm } from "./promo-code-form";

export default async function AdminPromoCodesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(["admin"], locale);

  const promoCodes = await getPromoCodes();

  const t = {
    title: locale === "en" ? "Promo codes" : "Códigos promocionales",
    code: locale === "en" ? "Code" : "Código",
    discount: locale === "en" ? "Discount" : "Descuento",
    minOrder: locale === "en" ? "Min. order" : "Pedido mínimo",
    used: locale === "en" ? "Used" : "Usos",
    status: locale === "en" ? "Status" : "Estado",
    active: locale === "en" ? "Active" : "Activo",
    inactive: locale === "en" ? "Inactive" : "Inactivo",
    empty: locale === "en" ? "No promo codes yet." : "Todavía no hay códigos.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {promoCodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.code}</TableHead>
                  <TableHead>{t.discount}</TableHead>
                  <TableHead>{t.minOrder}</TableHead>
                  <TableHead>{t.used}</TableHead>
                  <TableHead>{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promoCodes.map((promo) => (
                  <TableRow key={promo.id}>
                    <TableCell className="font-mono font-medium">{promo.code}</TableCell>
                    <TableCell>
                      {promo.discount_type === "percentage"
                        ? `${promo.discount_value}%`
                        : formatPrice(promo.discount_value, "MXN", locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatPrice(promo.min_order_cents, "MXN", locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {promo.times_used}
                      {promo.usage_limit ? ` / ${promo.usage_limit}` : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={promo.is_active ? "default" : "secondary"}>
                        {promo.is_active ? t.active : t.inactive}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <PromoCodeForm locale={locale} />
      </div>
    </main>
  );
}
