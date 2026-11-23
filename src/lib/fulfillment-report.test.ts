import { describe, expect, it } from "vitest";
import {
  csvCell,
  onTimePercent,
  parseFulfillmentReport,
  returnsCsv,
  stepRate,
  summaryCsv,
  toCsv,
  vendorsCsv,
  type FulfillmentReport,
} from "@/lib/fulfillment-report";

const report: FulfillmentReport = {
  days: 30,
  scope: "admin",
  funnel: { shipments: 10, shipped: 9, delivered: 8, completed: 6, cancelled: 1, reviewed: 3 },
  timing: { avg_prepare_hours: 24, avg_transit_hours: 60.5, avg_close_hours: 20, shipped_on_time: 8, shipped_late: 1, overdue_now: 0 },
  shipping_rating: { avg: 4.5, count: 4 },
  returns: [{ reason: "damaged", count: 2, refunded: 1 }],
  vendors: [
    { vendor_id: null, name: "Omnara", shipments: 9, shipped: 8, on_time_pct: 100, avg_transit_hours: 60.5, cancelled: 1, returns: 2, avg_rating: null, shipping_rating: 4 },
    { vendor_id: "v1", name: 'Café "Estudiantil", S.A.', shipments: 1, shipped: 1, on_time_pct: 0, avg_transit_hours: null, cancelled: 0, returns: 0, avg_rating: 4.5, shipping_rating: null },
  ],
  payouts: { payouts: 1, gross_mxn_cents: 24900, commission_mxn_cents: 747, net_mxn_cents: 24153 },
};

describe("parseFulfillmentReport", () => {
  it("accepts what the database returns and rejects anything else", () => {
    expect(parseFulfillmentReport(report)?.funnel.shipments).toBe(10);
    expect(parseFulfillmentReport(null)).toBeNull();
    expect(parseFulfillmentReport({ days: 30 })).toBeNull();
  });
});

describe("rates", () => {
  it("computes the on-time share, or null when nothing shipped", () => {
    expect(onTimePercent(report.timing)).toBe(89);
    expect(onTimePercent({ ...report.timing, shipped_on_time: 0, shipped_late: 0 })).toBeNull();
  });

  it("computes a funnel step as a share of the previous one", () => {
    expect(stepRate(9, 10)).toBe(90);
    expect(stepRate(1, 3)).toBe(33);
    expect(stepRate(5, 0)).toBeNull();
  });
});

describe("csvCell", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralizes text that a spreadsheet would run as a formula", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe(`"'=HYPERLINK(""http://evil"")"`);
    expect(csvCell("+1+1")).toBe("'+1+1");
    expect(csvCell("-2")).toBe("'-2");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });

  it("writes numbers as numbers, and empty for missing or non-finite values", () => {
    expect(csvCell(-5)).toBe("-5");
    expect(csvCell(60.5)).toBe("60.5");
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell(Number.NaN)).toBe("");
  });
});

describe("the exports", () => {
  it("builds a CSV with a header and CRLF line ends", () => {
    expect(toCsv(["a", "b"], [[1, "x"], [2, "y,z"]])).toBe('a,b\r\n1,x\r\n2,"y,z"\r\n');
  });

  it("writes the seller report with the seller name safely quoted", () => {
    const csv = vendorsCsv(report);
    expect(csv.split("\r\n")[0]).toBe("vendedor,envios,enviados,a_tiempo_pct,horas_en_transito,cancelados,devoluciones,calificacion,calificacion_envio");
    expect(csv).toContain('"Café ""Estudiantil"", S.A.",1,1,0,,0,0,4.5,');
    expect(csv).toContain("Omnara,9,8,100,60.5,1,2,,4");
  });

  it("writes the summary and the returns", () => {
    expect(summaryCsv(report)).toContain("comision_mxn_centavos,747");
    expect(summaryCsv(report)).toContain("enviados_tarde,1");
    expect(summaryCsv(report)).toContain("calificacion_promedio_de_envios,4.5");
    expect(summaryCsv(report)).toContain("envios_calificados,4");
    expect(returnsCsv(report)).toBe("motivo,devoluciones,reembolsadas\r\ndamaged,2,1\r\n");
  });
});
