import "server-only";

// Server-side check of a Cloudflare Turnstile token. Without TURNSTILE_SECRET_KEY
// the check is off (returns true), so nothing changes until the keys are set.
export async function verifyCaptcha(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch {
    // If Cloudflare can't be reached, fail closed: this guards a public form.
    return false;
  }
}
