import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing point of "Continue with Google". Supabase sends the user back here with
// a one-time `code`, which we exchange for a session (cookies are set by the
// server client). It lives under /api so the locale middleware leaves it alone.
//
// The redirect target is built from a fixed set of values (the request's own
// origin and a whitelisted locale): there is no `next` parameter to abuse as an
// open redirect.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const locale = searchParams.get("locale") === "en" ? "en" : "es";
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/${locale}`);
    }
  }
  return NextResponse.redirect(`${origin}/${locale}/login?error=oauth`);
}
