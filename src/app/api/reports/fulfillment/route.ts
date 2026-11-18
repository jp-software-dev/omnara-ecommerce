import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { parseFulfillmentReport, returnsCsv, summaryCsv, vendorsCsv } from "@/lib/fulfillment-report";
import { createClient } from "@/lib/supabase/server";

// CSV of the fulfillment report. The database function decides what the caller may see (an admin
// sees everything, a seller only their own shipments, anyone else gets nothing), so this route
// only validates the query and formats the answer.
const kinds = { resumen: summaryCsv, vendedores: vendorsCsv, devoluciones: returnsCsv } as const;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const days = z.coerce.number().int().min(1).max(365).safeParse(url.searchParams.get("days") ?? "30");
  const kind = z.enum(["resumen", "vendedores", "devoluciones"]).safeParse(url.searchParams.get("tipo") ?? "resumen");
  if (!days.success || !kind.success) return new NextResponse("Bad request", { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("fulfillment_analytics", { p_days: days.data });
  const report = error ? null : parseFulfillmentReport(data);
  if (!report) return new NextResponse("Not found", { status: 404 });

  // a BOM so Excel reads the accents as UTF-8
  const body = "﻿" + kinds[kind.data](report);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="omnara-${kind.data}-${days.data}d.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
