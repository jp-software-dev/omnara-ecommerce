import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processEmailOutbox } from "@/lib/email-outbox";

// Safety net for emails that couldn't go out right after the event (a provider
// outage, a retry). Call it from a scheduler with `Authorization: Bearer <CRON_SECRET>`;
// Vercel Cron sends exactly that header when CRON_SECRET is set in the project.
async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return NextResponse.json(await processEmailOutbox(50));
  } catch (error) {
    console.error("Email cron failed:", error);
    return NextResponse.json({ error: "Could not process the outbox." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
