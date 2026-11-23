import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { Locale } from "@/lib/ticket";
import { withTicketCore, type EmailAttachment, type TicketDb } from "@/lib/email-ticket-core";

export type { EmailAttachment };

/**
 * Adds the full ticket, the link to the order and the PDF to a purchase-confirmation email just
 * before it is sent (see email-ticket-core.ts for the details). Uses the service-role client.
 */
export async function withTicket(
  db: SupabaseClient<Database>,
  template: string,
  locale: Locale,
  payload: Record<string, unknown>
): Promise<{ payload: Record<string, unknown>; attachments: EmailAttachment[] }> {
  return withTicketCore(db as unknown as TicketDb, template, locale, payload);
}
