import { formatPrice } from "@/lib/format";
import {
  formatTicketDate,
  parseTicket,
  ticketAddressLines,
  ticketItemLabel,
  ticketMoney,
  ticketShipmentStatus,
  TICKET_NOTICE,
} from "@/lib/ticket";

type Locale = "es" | "en";
type Payload = Record<string, unknown>;
export type RenderedEmail = { subject: string; html: string };

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://omnara-ecommerce.vercel.app").replace(/\/$/, "");

// Everything that came from a person (product names, notes, business names) is
// escaped: these values end up inside HTML.
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Product names are stored as { es, en }.
function nameOf(value: unknown, locale: Locale): string {
  if (value && typeof value === "object") {
    const record = value as Record<string, string>;
    return record[locale] || record.es || record.en || "";
  }
  return typeof value === "string" ? value : "";
}

function money(cents: unknown, currency: unknown, locale: Locale) {
  return formatPrice(Number(cents ?? 0), currency === "USD" ? "USD" : "MXN", locale);
}

function layout(title: string, bodyHtml: string, cta?: { label: string; path: string }) {
  const button = cta
    ? `<p style="margin:24px 0"><a href="${SITE_URL}${esc(cta.path)}" style="background:#111;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${esc(cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#111;max-width:560px;margin:0 auto;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>
${bodyHtml}
${button}
<p style="color:#777;font-size:12px;margin-top:32px">Omnara</p>
</body></html>`;
}

const RETURN_STATUS_TEXT: Record<string, Record<Locale, string>> = {
  approved: {
    es: "El vendedor aprobó tu devolución. Omnara procesará el reembolso.",
    en: "The seller approved your return. Omnara will process the refund.",
  },
  rejected: {
    es: "El vendedor rechazó tu devolución. Si no estás de acuerdo, puedes abrir una disputa desde tu cuenta.",
    en: "The seller rejected your return. If you disagree you can open a dispute from your account.",
  },
  closed: {
    es: "Omnara revisó el caso y cerró la devolución sin reembolso.",
    en: "Omnara reviewed the case and closed the return without a refund.",
  },
  refunded: {
    es: "Tu reembolso fue enviado. Puede tardar unos días en reflejarse en tu tarjeta.",
    en: "Your refund was sent. It may take a few days to show on your card.",
  },
};

// Names of the products of a shipment, as a bulleted list (payload.items is a list of {es, en}).
function itemList(payload: Payload, locale: Locale): string {
  const names = (Array.isArray(payload.items) ? payload.items : []).map((value) => nameOf(value, locale)).filter(Boolean);
  return names.length ? `<ul>${names.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : "";
}

// Where the button of a milestone email leads. The database gives a path without the language
// (the account order, or the guest's confirmation page with its token).
function viewPath(payload: Payload, locale: Locale): string {
  const path = typeof payload.view_path === "string" ? payload.view_path : "";
  if (!path.startsWith("/")) return `/${locale}/cuenta/pedidos`;
  return /^\/(es|en)\//.test(path) ? path : `/${locale}${path}`;
}

function renderBase(template: string, locale: Locale, payload: Payload): RenderedEmail | null {
  const en = locale === "en";
  const order = esc(payload.order_number);
  const item = esc(nameOf(payload.item_name, locale));

  switch (template) {
    case "order_confirmation": {
      const subject = en ? `Order ${payload.order_number} confirmed` : `Pedido ${payload.order_number} confirmado`;
      const ticket = parseTicket(payload.ticket);
      if (ticket) {
        const m = (cents: number) => esc(ticketMoney(cents, ticket, locale));
        const rows = ticket.items
          .map(
            (item) =>
              `<tr><td style="padding:6px 0;border-bottom:1px solid #eee">${esc(ticketItemLabel(item, locale))}${item.seller ? `<br><span style="color:#777;font-size:12px">${esc(item.seller)}</span>` : ""}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${item.quantity}</td><td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right">${m(item.unit_price_cents * item.quantity)}</td></tr>`
          )
          .join("");
        const totals = [
          [en ? "Subtotal" : "Subtotal", m(ticket.subtotal_cents)],
          ...(ticket.discount_cents > 0
            ? [[`${en ? "Discount" : "Descuento"}${ticket.promo_code ? ` (${esc(ticket.promo_code)})` : ""}`, `-${m(ticket.discount_cents)}`]]
            : []),
          [en ? "Shipping" : "Envío", m(ticket.shipping_cents)],
        ]
          .map(([label, value]) => `<tr><td colspan="2" style="padding:3px 0;text-align:right;color:#555">${label}</td><td style="padding:3px 0;text-align:right">${value}</td></tr>`)
          .join("");
        const address = ticketAddressLines(ticket).map(esc).join("<br>");
        const shipments = ticket.shipments
          .map((s) => `<li>${esc(s.seller ?? "")} — ${esc(ticketShipmentStatus(s.status, locale))}${s.tracking_number ? ` (${esc(s.tracking_number)})` : ""}</li>`)
          .join("");
        const orderPath = typeof payload.view_path === "string" && payload.view_path.startsWith("/") ? payload.view_path : `/${locale}`;
        return {
          subject,
          html: layout(
            subject,
            `<p>${en ? "Thanks for your purchase!" : "¡Gracias por tu compra!"}</p>
<p style="background:#fff7e0;border:1px solid #f0d890;border-radius:8px;padding:10px 12px;font-size:12px;color:#5a4a10">${esc(TICKET_NOTICE[locale])}</p>
<p>${en ? "Order" : "Pedido"}: <strong>${order}</strong><br>${en ? "Date" : "Fecha"}: ${esc(formatTicketDate(ticket.created_at, locale))}${ticket.estimated_delivery_at ? `<br>${en ? "Estimated delivery" : "Entrega estimada"}: <strong>${esc(formatTicketDate(ticket.estimated_delivery_at, locale))}</strong>` : ""}</p>
<table style="width:100%;border-collapse:collapse;font-size:14px"><thead><tr><th style="text-align:left;padding:6px 0;border-bottom:2px solid #111">${en ? "Product" : "Producto"}</th><th style="padding:6px 8px;border-bottom:2px solid #111">${en ? "Qty" : "Cant."}</th><th style="text-align:right;padding:6px 0;border-bottom:2px solid #111">${en ? "Amount" : "Importe"}</th></tr></thead><tbody>${rows}${totals}<tr><td colspan="2" style="padding:8px 0;text-align:right;font-weight:700">Total</td><td style="padding:8px 0;text-align:right;font-weight:700">${m(ticket.total_cents)}</td></tr></tbody></table>
${address ? `<p><strong>${en ? "Ship to" : "Enviar a"}</strong><br>${address}</p>` : ""}
${shipments ? `<p><strong>${en ? "Shipments" : "Envíos"}</strong></p><ul>${shipments}</ul>` : ""}
<p>${en ? "The PDF of this receipt is attached. We'll keep you posted as your order moves." : "Adjuntamos el PDF de este comprobante. Te avisaremos cuando tu pedido avance."}</p>`,
            { label: en ? "View my order" : "Ver mi pedido", path: orderPath }
          ),
        };
      }
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "Thanks for your purchase!" : "¡Gracias por tu compra!"}</p>
<p>${en ? "Order" : "Pedido"}: <strong>${order}</strong><br>Total: <strong>${esc(money(payload.total_cents, payload.currency, locale))}</strong></p>
<p>${en ? "We'll email you when your items ship." : "Te avisaremos por correo cuando se envíen tus artículos."}</p>`,
          { label: en ? "View my orders" : "Ver mis pedidos", path: `/${locale}/cuenta/pedidos` }
        ),
      };
    }
    case "new_sale": {
      const subject = en ? `New sale: order ${payload.order_number}` : `Nueva venta: pedido ${payload.order_number}`;
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "Someone bought from your business" : "Alguien compró en tu negocio"}: <strong>${item}</strong>.</p>
<p>${en ? "Order" : "Pedido"}: <strong>${order}</strong></p>
<p>${en ? "Ship it and add the tracking number from your panel." : "Envíalo y registra el número de rastreo desde tu panel."}</p>`,
          { label: en ? "Open orders" : "Abrir pedidos", path: `/${locale}/admin/pedidos` }
        ),
      };
    }
    case "item_shipped": {
      const subject = en ? `Your item shipped (order ${payload.order_number})` : `Tu artículo fue enviado (pedido ${payload.order_number})`;
      const tracking = payload.tracking_number
        ? `<p>${en ? "Tracking number" : "Número de rastreo"}: <strong>${esc(payload.tracking_number)}</strong></p>`
        : "";
      return {
        subject,
        html: layout(
          subject,
          `<p><strong>${item}</strong> ${en ? "is on its way." : "va en camino."}</p>${tracking}
<p>${en ? "You can request a return up to 30 days after it is delivered." : "Puedes pedir una devolución hasta 30 días después de que te llegue."}</p>`,
          { label: en ? "View order" : "Ver pedido", path: `/${locale}/cuenta/pedidos` }
        ),
      };
    }
    case "shipment_update": {
      const status = String(payload.status ?? "");
      const seller = esc(payload.seller ?? "Omnara");
      const eta = payload.estimated_delivery_at
        ? `<p>${en ? "Estimated delivery" : "Entrega estimada"}: <strong>${esc(formatTicketDate(String(payload.estimated_delivery_at), locale))}</strong></p>`
        : "";
      const tracking = payload.tracking_number
        ? `<p>${en ? "Tracking number" : "Número de rastreo"}: <strong>${esc(payload.tracking_number)}</strong></p>`
        : "";
      const copy: Record<string, { subject: [string, string]; body: [string, string]; extra: string; cta: [string, string] }> = {
        preparing: {
          subject: [`Se está preparando tu pedido ${payload.order_number}`, `We are preparing your order ${payload.order_number}`],
          body: [`${seller} está preparando tu pedido. Saldrá a más tardar 24 horas después de tu compra.`, `${seller} is preparing your order. It will ship within 24 hours of your purchase.`],
          extra: eta,
          cta: ["Ver mi pedido", "View my order"],
        },
        arrived_state: {
          subject: [`Tu pedido ya llegó a tu estado (${payload.order_number})`, `Your order arrived in your state (${payload.order_number})`],
          body: ["Tu pedido ya llegó a tu estado y pronto saldrá a reparto.", "Your order arrived in your state and will go out for delivery soon."],
          extra: eta + tracking,
          cta: ["Ver seguimiento", "Track my order"],
        },
        out_for_delivery: {
          subject: [`Tu pedido va en reparto a tu domicilio (${payload.order_number})`, `Your order is out for delivery (${payload.order_number})`],
          body: ["Tu pedido va en reparto a tu domicilio. Llegará hoy.", "Your order is on its way to your address. It will arrive today."],
          extra: eta + tracking,
          cta: ["Ver seguimiento", "Track my order"],
        },
        delivered: {
          subject: [`Tu pedido fue entregado (${payload.order_number})`, `Your order was delivered (${payload.order_number})`],
          body: [
            "Tu pedido fue entregado. Confirma que lo recibiste para cerrar el pedido y poder reseñar tus productos.",
            "Your order was delivered. Confirm you received it to close the order and review your products.",
          ],
          extra: "",
          cta: ["Ya lo recibí", "I received it"],
        },
      };
      const entry = copy[status];
      if (!entry) return null;
      const i = en ? 1 : 0;
      return {
        subject: entry.subject[i],
        html: layout(entry.subject[i], `<p>${entry.body[i]}</p>${itemList(payload, locale)}${entry.extra}`, {
          label: entry.cta[i],
          path: viewPath(payload, locale),
        }),
      };
    }
    case "shipment_incident": {
      const kind = String(payload.kind ?? "");
      const eta = payload.estimated_delivery_at
        ? `<p>${en ? "New estimated delivery" : "Nueva entrega estimada"}: <strong>${esc(formatTicketDate(String(payload.estimated_delivery_at), locale))}</strong></p>`
        : "";
      const note = payload.note ? `<p>${en ? "Note" : "Nota"}: ${esc(payload.note)}</p>` : "";
      const copy: Record<string, { subject: [string, string]; body: [string, string]; withEta: boolean; cta: [string, string] }> = {
        delay: {
          subject: [`Tu pedido ${payload.order_number} tiene un retraso`, `Your order ${payload.order_number} is delayed`],
          body: ["Tu envío tuvo un retraso. Lamentamos las molestias.", "Your shipment was delayed. We are sorry for the inconvenience."],
          withEta: true,
          cta: ["Ver seguimiento", "Track my order"],
        },
        failed_attempt: {
          subject: [`No pudimos entregar tu pedido ${payload.order_number}`, `We couldn't deliver your order ${payload.order_number}`],
          body: ["No pudimos entregar tu pedido en el primer intento. Lo intentaremos de nuevo.", "We couldn't deliver your order on the first attempt. We'll try again."],
          withEta: true,
          cta: ["Ver seguimiento", "Track my order"],
        },
        damaged: {
          subject: [`Problema con el paquete de tu pedido ${payload.order_number}`, `Problem with the package of your order ${payload.order_number}`],
          body: [
            "Se reportó un problema con el paquete de tu pedido. Cuando lo recibas, si llegó dañado, puedes pedir una devolución con fotos desde tu pedido (dentro de 30 días).",
            "A problem with the package of your order was reported. When you receive it, if it arrived damaged, you can request a return with photos from your order (within 30 days).",
          ],
          withEta: false,
          cta: ["Ver mi pedido", "View my order"],
        },
      };
      const entry = copy[kind];
      if (!entry) return null;
      const i = en ? 1 : 0;
      return {
        subject: entry.subject[i],
        html: layout(entry.subject[i], `<p>${entry.body[i]}</p>${itemList(payload, locale)}${entry.withEta ? eta : ""}${note}`, {
          label: entry.cta[i],
          path: viewPath(payload, locale),
        }),
      };
    }
    case "shipment_cancelled": {
      const forSeller = payload.for_seller === true;
      const subject = forSeller
        ? en ? `A shipment was cancelled (order ${payload.order_number})` : `Se canceló un envío (pedido ${payload.order_number})`
        : en ? `Your shipment was cancelled (order ${payload.order_number})` : `Se canceló tu envío (pedido ${payload.order_number})`;
      const refund = money(payload.refund_cents, payload.currency, locale);
      const body = forSeller
        ? en
          ? "The customer cancelled this shipment before it left. The items went back to your stock and there is nothing to ship."
          : "El cliente canceló este envío antes de que saliera. Los artículos regresaron a tu inventario y no hay nada que enviar."
        : en
          ? `Your shipment was cancelled and the items went back to stock. Refund: <strong>${esc(refund)}</strong> (simulated: nothing was charged).${payload.whole_order === true ? " It includes the shipping fee because the whole order was cancelled." : ""}`
          : `Tu envío fue cancelado y los artículos regresaron al inventario. Reembolso: <strong>${esc(refund)}</strong> (simulado: no se cobró nada).${payload.whole_order === true ? " Incluye el envío porque se canceló todo el pedido." : ""}`;
      return {
        subject,
        html: layout(subject, `<p>${body}</p>${itemList(payload, locale)}`, forSeller
          ? { label: en ? "Open orders" : "Abrir pedidos", path: `/${locale}/admin/pedidos` }
          : { label: en ? "Continue shopping" : "Seguir comprando", path: `/${locale}` }),
      };
    }
    case "confirm_delivery_reminder": {
      const second = payload.second === true;
      const subject = second
        ? en ? `Last reminder: did your order ${payload.order_number} arrive?` : `Último recordatorio: ¿te llegó tu pedido ${payload.order_number}?`
        : en ? `Did your order ${payload.order_number} arrive?` : `¿Ya recibiste tu pedido ${payload.order_number}?`;
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "Your order was delivered a few days ago. If you already have it, confirm it so the order is closed and you can review your products." : "Tu pedido se entregó hace unos días. Si ya lo tienes, confírmalo para cerrar el pedido y poder reseñar tus productos."}</p>${itemList(payload, locale)}
<p>${en ? "If something is wrong, you can request a return within 30 days of the delivery." : "Si algo salió mal, puedes pedir una devolución dentro de los 30 días posteriores a la entrega."}</p>`,
          { label: en ? "I received it" : "Ya lo recibí", path: viewPath(payload, locale) }
        ),
      };
    }
    case "review_reminder": {
      const subject = en ? `How was your purchase? (order ${payload.order_number})` : `¿Qué te pareció tu compra? (pedido ${payload.order_number})`;
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "Thanks for closing your order. Your opinion helps other buyers: tell us what you thought of" : "Gracias por cerrar tu pedido. Tu opinión ayuda a otros compradores: cuéntanos qué te pareció"}</p>${itemList(payload, locale)}`,
          { label: en ? "Leave a review" : "Dejar una reseña", path: viewPath(payload, locale) }
        ),
      };
    }
    case "delivery_confirmed": {
      const subject = en ? `The customer confirmed the delivery (order ${payload.order_number})` : `El cliente confirmó la entrega (pedido ${payload.order_number})`;
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "The customer confirmed they received" : "El cliente confirmó que recibió"}:</p>${itemList(payload, locale)}
<p>${en ? "The sale is closed. Unless a return is open, it is ready for the payout (simulated)." : "La venta quedó cerrada. Si no hay una devolución abierta, ya está lista para el pago (simulado)."}</p>`,
          { label: en ? "Open payouts" : "Abrir pagos", path: `/${locale}/admin/pagos` }
        ),
      };
    }
    case "return_requested": {
      const subject = en ? `Return requested (order ${payload.order_number})` : `Devolución solicitada (pedido ${payload.order_number})`;
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "A customer requested a return of" : "Un cliente solicitó la devolución de"} <strong>${item}</strong>.</p>
<p>${en ? "Please approve or reject it from your panel." : "Apruébala o recházala desde tu panel."}</p>`,
          { label: en ? "Review return" : "Revisar devolución", path: `/${locale}/admin/devoluciones/${esc(payload.return_id)}` }
        ),
      };
    }
    case "return_status": {
      const status = String(payload.status ?? "");
      const text = RETURN_STATUS_TEXT[status]?.[locale];
      if (!text) return null;
      const subject = en ? `Update on your return (order ${payload.order_number})` : `Novedades de tu devolución (pedido ${payload.order_number})`;
      const note = payload.note ? `<p>${en ? "Note" : "Nota"}: ${esc(payload.note)}</p>` : "";
      const amount =
        status === "refunded" || status === "approved"
          ? `<p>${en ? "Refund amount" : "Monto a reembolsar"}: <strong>${esc(money(payload.refund_amount_cents, payload.currency, locale))}</strong></p>`
          : "";
      return {
        subject,
        html: layout(subject, `<p><strong>${item}</strong></p><p>${esc(text)}</p>${amount}${note}`, {
          label: en ? "View return" : "Ver devolución",
          path: `/${locale}/cuenta/devoluciones/${esc(payload.return_id)}`,
        }),
      };
    }
    case "return_escalated": {
      const subject = en ? `Dispute to review (order ${payload.order_number})` : `Disputa por revisar (pedido ${payload.order_number})`;
      return {
        subject,
        html: layout(
          subject,
          `<p>${en ? "A return needs an Omnara decision" : "Una devolución necesita una decisión de Omnara"}: <strong>${item}</strong>.</p>`,
          { label: en ? "Open returns" : "Abrir devoluciones", path: `/${locale}/admin/devoluciones/${esc(payload.return_id)}` }
        ),
      };
    }
    case "application_decision": {
      const approved = payload.status === "approved";
      const subject = approved
        ? en ? "Your seller application was approved" : "Tu solicitud de vendedor fue aprobada"
        : en ? "Your seller application was not approved" : "Tu solicitud de vendedor no fue aprobada";
      const reason = !approved && payload.reason ? `<p>${en ? "Reason" : "Motivo"}: ${esc(payload.reason)}</p>` : "";
      return {
        subject,
        html: layout(
          subject,
          `<p><strong>${esc(payload.business_name)}</strong></p>
<p>${
            approved
              ? en ? "Your business is ready. You can now add products from your panel." : "Tu negocio está listo. Ya puedes agregar productos desde tu panel."
              : en ? "You can send a new application at any time." : "Puedes enviar una nueva solicitud cuando quieras."
          }</p>${reason}`,
          approved
            ? { label: en ? "Open my panel" : "Abrir mi panel", path: `/${locale}/admin` }
            : { label: en ? "Apply again" : "Volver a aplicar", path: `/${locale}/vender` }
        ),
      };
    }
    default:
      return null;
  }
}

// Omnara is an educational demo: every email says so, so a test order can never be
// mistaken for a real purchase when it lands in someone's inbox.
const DEMO_NOTICE: Record<Locale, string> = {
  es: "Omnara es un proyecto educativo de demostración: este pedido es de prueba, ningún producto es real y no se cobró ni se enviará nada.",
  en: "Omnara is an educational demo project: this order is a test, no product is real and nothing was charged or will be shipped.",
};

export function renderEmail(template: string, locale: Locale, payload: Payload): RenderedEmail | null {
  const rendered = renderBase(template, locale, payload);
  if (!rendered) return null;
  const notice = `<p style="margin-top:16px;padding:10px 12px;background:#fff7e6;border:1px solid #f0c36d;border-radius:6px;color:#7a5200;font-size:12px">${esc(DEMO_NOTICE[locale])}</p>`;
  return { ...rendered, html: rendered.html.replace("</body>", `${notice}
</body>`) };
}
