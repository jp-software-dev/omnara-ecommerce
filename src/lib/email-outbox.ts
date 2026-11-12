import "server-only";
import { after } from "next/server";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { renderEmail } from "@/lib/email-templates";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_ATTEMPTS = 5;

export type OutboxResult = {
  /** False when RESEND_API_KEY / EMAIL_FROM are missing: nothing is sent, rows stay queued. */
  configured: boolean;
  sent: number;
  failed: number;
};

// Sends pending emails from email_outbox. Safe to call from several places at
// once: a row is claimed by bumping its `attempts` counter only if nobody else
// did first, so the same email is never sent twice.
export async function processEmailOutbox(limit = 20): Promise<OutboxResult> {
  const result: OutboxResult = { configured: isEmailConfigured(), sent: 0, failed: 0 };
  if (!result.configured) return result;

  const db = createServiceRoleClient();
  const { data: rows, error } = await db
    .from("email_outbox")
    .select("id, to_email, locale, template, payload, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  for (const row of rows) {
    // Claim the row.
    const { data: claimed } = await db
      .from("email_outbox")
      .update({ attempts: row.attempts + 1 })
      .eq("id", row.id)
      .eq("status", "pending")
      .eq("attempts", row.attempts)
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    try {
      const rendered = renderEmail(
        row.template,
        row.locale === "en" ? "en" : "es",
        (row.payload ?? {}) as Record<string, unknown>
      );
      if (!rendered) throw new Error(`No template for "${row.template}".`);
      await sendEmail({ to: row.to_email, subject: rendered.subject, html: rendered.html });
      await db
        .from("email_outbox")
        .update({ status: "sent", sent_at: new Date().toISOString(), last_error: null })
        .eq("id", row.id);
      result.sent += 1;
    } catch (sendError) {
      const attempts = row.attempts + 1;
      await db
        .from("email_outbox")
        .update({
          status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
          last_error: (sendError instanceof Error ? sendError.message : String(sendError)).slice(0, 500),
        })
        .eq("id", row.id);
      result.failed += 1;
    }
  }
  return result;
}

// Call at the end of a server action / route handler: sends whatever the
// database just queued once the response is out, so notifications go out
// seconds after the event without a scheduler. Errors are logged, never thrown.
export function flushEmailsSoon() {
  after(async () => {
    try {
      await processEmailOutbox();
    } catch (error) {
      console.error("Email outbox flush failed:", error);
    }
  });
}
