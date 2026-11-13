import { formatPrice } from "@/lib/format";

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

function renderBase(template: string, locale: Locale, payload: Payload): RenderedEmail | null {
  const en = locale === "en";
  const order = esc(payload.order_number);
  const item = esc(nameOf(payload.item_name, locale));

  switch (template) {
    case "order_confirmation": {
      const subject = en ? `Order ${payload.order_number} confirmed` : `Pedido ${payload.order_number} confirmado`;
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
<p>${en ? "You can request a return up to 30 days after it shipped." : "Puedes pedir una devolución hasta 30 días después del envío."}</p>`,
          { label: en ? "View order" : "Ver pedido", path: `/${locale}/cuenta/pedidos` }
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
