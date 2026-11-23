import { buildTicketPdf } from "@/lib/ticket-pdf";
import { parseTicket, ticketFilename, type Locale } from "@/lib/ticket";

// The logic that adds the purchase ticket to its confirmation email. It lives apart from
// email-ticket.ts (which is server-only) so it can be tested with a fake database.

export type EmailAttachment = { filename: string; content: string };

/** The only two things the ticket needs from the database client. */
export type TicketDb = {
  rpc: (
    name: "order_ticket_for_email",
    args: { p_order: string }
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: "orders") => {
    select: (columns: "demo_token") => {
      eq: (column: "id", value: string) => {
        maybeSingle: () => PromiseLike<{ data: { demo_token: string | null } | null }>;
      };
    };
  };
};

/**
 * The confirmation email is queued when the order row is created, before its items exist. So
 * the ticket is built here, when the email is actually sent: it adds the full ticket to the
 * payload, the link to open the order, and the PDF as an attachment. If the order cannot be
 * read the email still goes out in its short form.
 */
export async function withTicketCore(
  db: TicketDb,
  template: string,
  locale: Locale,
  payload: Record<string, unknown>
): Promise<{ payload: Record<string, unknown>; attachments: EmailAttachment[] }> {
  const orderId = typeof payload.order_id === "string" ? payload.order_id : null;
  if (template !== "order_confirmation" || !orderId) return { payload, attachments: [] };

  const { data, error } = await db.rpc("order_ticket_for_email", { p_order: orderId });
  const ticket = error ? null : parseTicket(data);
  if (!ticket) return { payload, attachments: [] };

  // A signed-in buyer opens the order in their account; a guest uses the secret token of the
  // confirmation page.
  let viewPath = `/${locale}/cuenta/pedidos/${orderId}`;
  if (!ticket.has_account) {
    const { data: order } = await db.from("orders").select("demo_token").eq("id", orderId).maybeSingle();
    viewPath = order?.demo_token
      ? `/${locale}/checkout/confirmacion?demo_order=${orderId}&token=${order.demo_token}`
      : `/${locale}`;
  }

  const pdf = buildTicketPdf(ticket, locale);
  return {
    payload: { ...payload, ticket, view_path: viewPath },
    attachments: [{ filename: ticketFilename(ticket), content: Buffer.from(pdf).toString("base64") }],
  };
}
