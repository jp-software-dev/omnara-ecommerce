import "server-only";

// Sends one email through Resend's HTTP API. Nothing is sent until both
// RESEND_API_KEY and EMAIL_FROM are configured: until then queued emails simply
// wait in email_outbox, exactly like Stripe-dependent features stay inert
// without their keys.

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("Email is not configured (RESEND_API_KEY / EMAIL_FROM).");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [input.to], subject: input.subject, html: input.html }),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Resend responded ${response.status}: ${detail}`);
  }
}
