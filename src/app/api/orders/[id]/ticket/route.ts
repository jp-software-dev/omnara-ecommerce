import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildTicketPdf } from "@/lib/ticket-pdf";
import { parseTicket, ticketFilename } from "@/lib/ticket";

// Downloads the purchase ticket as a PDF. Allowed for the buyer, a seller of the order and an
// admin (through their session), or for anyone holding the order's secret token (guests).
// The database function decides; anything it refuses is answered as "not found" so the
// existence of an order is never revealed.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);

  const parsedId = z.string().uuid().safeParse(id);
  const token = url.searchParams.get("token");
  const parsedToken = token === null ? { success: true as const, data: null } : z.string().uuid().safeParse(token);
  if (!parsedId.success || !parsedToken.success) {
    return new NextResponse("Not found", { status: 404 });
  }
  const locale = url.searchParams.get("lang") === "en" ? "en" : "es";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("order_ticket", {
    p_order: parsedId.data,
    ...(parsedToken.data ? { p_token: parsedToken.data } : {}),
  });
  const ticket = error ? null : parseTicket(data);
  if (!ticket) {
    return new NextResponse("Not found", { status: 404 });
  }

  const pdf = buildTicketPdf(ticket, locale);
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ticketFilename(ticket)}"`,
      // it holds personal data: never cached by a shared cache
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
