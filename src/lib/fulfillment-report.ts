import { z } from "zod";

// The fulfillment report: how shipments move and how each seller does. The numbers come from the
// database (fulfillment_analytics); this file validates them and turns them into CSV.

const num = z.number().nullable().optional();

const schema = z.object({
  days: z.number(),
  scope: z.enum(["admin", "vendor"]),
  funnel: z.object({
    shipments: z.number(),
    shipped: z.number(),
    delivered: z.number(),
    completed: z.number(),
    cancelled: z.number(),
    reviewed: z.number(),
  }),
  timing: z.object({
    avg_prepare_hours: num,
    avg_transit_hours: num,
    avg_close_hours: num,
    shipped_on_time: z.number(),
    shipped_late: z.number(),
    overdue_now: z.number(),
  }),
  shipping_rating: z.object({ avg: num, count: z.number() }).optional(),
  returns: z.array(z.object({ reason: z.string(), count: z.number(), refunded: z.number() })),
  vendors: z.array(
    z.object({
      vendor_id: z.string().nullable(),
      name: z.string(),
      shipments: z.number(),
      shipped: z.number(),
      on_time_pct: num,
      avg_transit_hours: num,
      cancelled: z.number(),
      returns: z.number(),
      avg_rating: num,
      shipping_rating: num,
    })
  ),
  payouts: z.object({
    payouts: z.number(),
    gross_mxn_cents: z.number(),
    commission_mxn_cents: z.number(),
    net_mxn_cents: z.number(),
  }),
});

export type FulfillmentReport = z.infer<typeof schema>;

export function parseFulfillmentReport(value: unknown): FulfillmentReport | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Share of shipments that left on time, 0-100, or null when none has shipped yet. */
export function onTimePercent(timing: FulfillmentReport["timing"]): number | null {
  const total = timing.shipped_on_time + timing.shipped_late;
  return total === 0 ? null : Math.round((100 * timing.shipped_on_time) / total);
}

/** Step of the funnel as a percentage of the previous one (null when the previous is zero). */
export function stepRate(current: number, previous: number): number | null {
  return previous === 0 ? null : Math.round((100 * current) / previous);
}

// ---------------------------------------------------------------------------------------- CSV

/**
 * One CSV cell. Quotes when needed (RFC 4180) and neutralizes spreadsheet formulas: a text that
 * starts with = + - @ (or a tab or carriage return) would be run as a formula by Excel, so it is
 * prefixed with an apostrophe. Real numbers are written as they are.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export function vendorsCsv(report: FulfillmentReport): string {
  return toCsv(
    ["vendedor", "envios", "enviados", "a_tiempo_pct", "horas_en_transito", "cancelados", "devoluciones", "calificacion", "calificacion_envio"],
    report.vendors.map((v) => [v.name, v.shipments, v.shipped, v.on_time_pct, v.avg_transit_hours, v.cancelled, v.returns, v.avg_rating, v.shipping_rating])
  );
}

export function summaryCsv(report: FulfillmentReport): string {
  const f = report.funnel;
  const t = report.timing;
  return toCsv(
    ["metrica", "valor"],
    [
      ["periodo_dias", report.days],
      ["envios", f.shipments],
      ["enviados", f.shipped],
      ["entregados", f.delivered],
      ["cerrados_por_el_cliente", f.completed],
      ["cancelados", f.cancelled],
      ["con_resena", f.reviewed],
      ["horas_promedio_preparacion", t.avg_prepare_hours],
      ["horas_promedio_en_transito", t.avg_transit_hours],
      ["horas_promedio_hasta_cierre", t.avg_close_hours],
      ["enviados_a_tiempo", t.shipped_on_time],
      ["enviados_tarde", t.shipped_late],
      ["atrasados_ahora", t.overdue_now],
      ["calificacion_promedio_de_envios", report.shipping_rating?.avg ?? null],
      ["envios_calificados", report.shipping_rating?.count ?? 0],
      ["pagos_simulados", report.payouts.payouts],
      ["ventas_pagadas_mxn_centavos", report.payouts.gross_mxn_cents],
      ["comision_mxn_centavos", report.payouts.commission_mxn_cents],
    ]
  );
}

export function returnsCsv(report: FulfillmentReport): string {
  return toCsv(
    ["motivo", "devoluciones", "reembolsadas"],
    report.returns.map((r) => [r.reason, r.count, r.refunded])
  );
}
