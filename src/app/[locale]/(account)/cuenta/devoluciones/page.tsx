import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getMyReturns } from "@/lib/supabase/queries";
import { formatPrice, pickLocale } from "@/lib/format";
import { reasonLabel, statusLabel } from "@/lib/returns";

export default async function MyReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const returns = await getMyReturns(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/cuenta"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {en ? "My account" : "Mi cuenta"}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{en ? "My returns" : "Mis devoluciones"}</h1>

      {returns.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {en
            ? "You haven't requested any returns. You can do it from an order once its items have shipped."
            : "No has pedido devoluciones. Puedes hacerlo desde un pedido cuando sus artículos ya se enviaron."}
        </p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {returns.map((item) => (
            <li key={item.id}>
              <Link href={`/cuenta/devoluciones/${item.id}`} className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-muted/50">
                <div>
                  <p className="font-medium">
                    {item.order_items ? pickLocale(item.order_items.product_name_snapshot, locale) : "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {item.orders?.order_number} · {reasonLabel(item.reason, locale)} ·{" "}
                    {formatPrice(item.refund_amount_cents, item.currency === "USD" ? "USD" : "MXN", locale)}
                  </p>
                </div>
                <Badge variant={item.status === "refunded" ? "default" : "secondary"}>
                  {statusLabel(item.status, locale)}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
