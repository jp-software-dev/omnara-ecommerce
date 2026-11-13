import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, pickLocale } from "@/lib/format";
import { isSettled, reasonLabel, roleLabel, statusLabel } from "@/lib/returns";
import type { getReturnDetail } from "@/lib/supabase/queries";
import { ReturnMessageForm } from "./return-message-form";

type ReturnDetailData = NonNullable<Awaited<ReturnType<typeof getReturnDetail>>>;

// Same view for the buyer, the seller and the admin: only the `actions` slot
// (what each role may do next) differs between the pages that render it.
export function ReturnDetail({
  data,
  locale,
  actions,
}: {
  data: ReturnDetailData;
  locale: string;
  actions?: ReactNode;
}) {
  const en = locale === "en";
  const currency = data.currency === "USD" ? "USD" : "MXN";
  const item = data.order_items;
  const t = {
    order: en ? "Order" : "Pedido",
    product: en ? "Product" : "Producto",
    reason: en ? "Reason" : "Motivo",
    details: en ? "Details" : "Detalle",
    refund: en ? "Refund amount" : "Monto a reembolsar",
    refundNote: en
      ? "Proportional to any discount applied; shipping is not refunded."
      : "Proporcional al descuento aplicado; el envío no se reembolsa.",
    decision: en ? "Decision note" : "Nota de la decisión",
    refundId: en ? "Stripe refund" : "Reembolso en Stripe",
    thread: en ? "Conversation" : "Conversación",
    noMessages: en ? "No messages yet." : "Todavía no hay mensajes.",
  };

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border p-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            {item ? pickLocale(item.product_name_snapshot, locale) : t.product}
            {item ? ` × ${item.quantity}` : ""}
          </h2>
          <Badge variant={data.status === "refunded" ? "default" : "secondary"}>
            {statusLabel(data.status, locale)}
          </Badge>
        </div>
        <dl className="mt-3 grid gap-2">
          {data.orders ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.order}</dt>
              <dd className="font-mono">{data.orders.order_number}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t.reason}</dt>
            <dd>{reasonLabel(data.reason, locale)}</dd>
          </div>
          {data.details ? (
            <div>
              <dt className="text-muted-foreground">{t.details}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{data.details}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{t.refund}</dt>
            <dd className="font-medium">{formatPrice(data.refund_amount_cents, currency, locale)}</dd>
          </div>
          <p className="text-xs text-muted-foreground">{t.refundNote}</p>
          {data.decision_note ? (
            <div>
              <dt className="text-muted-foreground">{t.decision}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{data.decision_note}</dd>
            </div>
          ) : null}
          {data.stripe_refund_id ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{t.refundId}</dt>
              <dd className="font-mono text-xs">{data.stripe_refund_id}</dd>
            </div>
          ) : null}
        </dl>
        {actions ? <div className="mt-4 border-t pt-4">{actions}</div> : null}
      </section>

      <section className="rounded-lg border p-5 text-sm">
        <h2 className="text-base font-semibold">{t.thread}</h2>
        {data.return_messages.length === 0 ? (
          <p className="mt-2 text-muted-foreground">{t.noMessages}</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {data.return_messages.map((message) => (
              <li key={message.id} className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  {roleLabel(message.author_role, locale)} ·{" "}
                  {new Date(message.created_at).toLocaleString(locale === "en" ? "en-US" : "es-MX")}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{message.body}</p>
                {message.attachment_url ? (
                  <a href={message.attachment_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={message.attachment_url}
                      alt={locale === "en" ? "Attached photo" : "Foto adjunta"}
                      className="max-h-48 rounded-md border"
                    />
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {isSettled(data.status) ? null : <ReturnMessageForm returnId={data.id} locale={locale} />}
      </section>
    </div>
  );
}
