import { CheckCircle2 } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { DemoBanner } from "@/components/shop/demo-banner";
import { ClearCartOnMount } from "@/components/shop/clear-cart-on-mount";
import { formatPrice } from "@/lib/format";
import { getOrderBySessionId } from "./actions";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function CheckoutConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { locale } = await params;
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect({ href: "/", locale });
    return null;
  }

  let order = await getOrderBySessionId(sessionId);
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    await sleep(800);
    order = await getOrderBySessionId(sessionId);
  }

  const t = {
    title: locale === "en" ? "Order confirmed" : "Pedido confirmado",
    pending:
      locale === "en"
        ? "We're finishing up your order — refresh this page in a few seconds."
        : "Estamos terminando de procesar tu pedido — actualiza esta página en unos segundos.",
    orderNumber: locale === "en" ? "Order number" : "Número de pedido",
    continueShopping: locale === "en" ? "Continue shopping" : "Seguir comprando",
    viewOrders: locale === "en" ? "View my orders" : "Ver mis pedidos",
  };

  if (!order) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <p className="text-muted-foreground">{t.pending}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
      <ClearCartOnMount />
      <CheckCircle2 className="mx-auto size-12 text-green-600" />
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-muted-foreground">
        {t.orderNumber}: <span className="font-mono">{order.order_number}</span>
      </p>
      <p className="mt-1 text-lg font-semibold">
        {formatPrice(order.total_cents, order.currency === "USD" ? "USD" : "MXN", locale)}
      </p>

      <div className="mt-6">
        <DemoBanner locale={locale} />
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/">{t.continueShopping}</Link>}
        />
        <Button nativeButton={false} render={<Link href="/cuenta/pedidos">{t.viewOrders}</Link>} />
      </div>
    </main>
  );
}
