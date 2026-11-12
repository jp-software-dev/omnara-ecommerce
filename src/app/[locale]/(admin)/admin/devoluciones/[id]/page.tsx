import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { ReturnDetail } from "@/components/shop/return-detail";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { getReturnDetail } from "@/lib/supabase/queries";
import { formatPrice } from "@/lib/format";
import { DecisionForm } from "../decision-form";
import { RefundButton } from "../refund-button";
import { RestockButton } from "../restock-button";

export default async function AdminReturnDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const en = locale === "en";
  const { role, user } = await requireRole(["admin", "vendor"], locale);

  const data = await getReturnDetail(id);
  // A vendor can read a row where they are the BUYER too; here only their own sales.
  if (!data || (role === "vendor" && data.vendor_id !== user.id)) {
    redirect({ href: "/admin/devoluciones", locale });
    return null;
  }

  let actions: React.ReactNode = undefined;
  if (role === "vendor" && data.status === "requested") {
    actions = <DecisionForm returnId={data.id} locale={locale} mode="vendor" />;
  } else if (role === "admin" && ["requested", "rejected", "escalated"].includes(data.status)) {
    actions = <DecisionForm returnId={data.id} locale={locale} mode="admin" />;
  } else if (role === "admin" && data.status === "approved") {
    actions = (
      <RefundButton
        returnId={data.id}
        locale={locale}
        amountLabel={formatPrice(data.refund_amount_cents, data.currency === "USD" ? "USD" : "MXN", locale)}
      />
    );
  }

  // Once approved, the seller (or an admin) decides whether the item goes back on sale.
  if (data.status === "approved" || data.status === "refunded") {
    const restock = data.restocked_at ? (
      <p className="text-sm text-muted-foreground">
        {en ? "Returned to stock on " : "Repuesto al inventario el "}
        {new Date(data.restocked_at).toLocaleDateString(en ? "en-US" : "es-MX")}.
      </p>
    ) : (
      <RestockButton returnId={data.id} quantity={data.order_items?.quantity ?? 1} locale={locale} />
    );
    actions = (
      <div className="grid gap-4">
        {actions}
        {restock}
      </div>
    );
  }

  return (
    <main className="flex-1 p-6 md:p-10">
      <Link
        href="/admin/devoluciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {en ? "Back to returns" : "Volver a devoluciones"}
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">{en ? "Return" : "Devolución"}</h1>
      <div className="max-w-2xl">
        <ReturnDetail data={data} locale={locale} actions={actions} />
      </div>
    </main>
  );
}
