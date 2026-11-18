import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { onTimePercent, parseFulfillmentReport, stepRate } from "@/lib/fulfillment-report";
import { reasonLabel } from "@/lib/returns";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";

const PERIODS = [7, 30, 90] as const;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default async function FulfillmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dias?: string }>;
}) {
  const { locale } = await params;
  const { dias } = await searchParams;
  const { role } = await requireRole(["admin", "vendor"], locale);
  const en = locale === "en";
  const days = (PERIODS as readonly number[]).includes(Number(dias)) ? Number(dias) : 30;

  const supabase = await createClient();
  const { data } = await supabase.rpc("fulfillment_analytics", { p_days: days });
  const report = parseFulfillmentReport(data);

  const t = {
    title: en ? "Fulfillment" : "Cumplimiento de envíos",
    intro:
      role === "admin"
        ? en
          ? "How orders move through shipping and delivery, and how each seller does."
          : "Cómo avanzan los pedidos del envío a la entrega, y cómo le va a cada vendedor."
        : en
          ? "How your shipments are doing."
          : "Cómo van tus envíos.",
    period: en ? "Last" : "Últimos",
    daysWord: en ? "days" : "días",
    empty: en ? "There is no data to show." : "No hay datos para mostrar.",
    funnel: en ? "From shipment to review" : "Del envío a la reseña",
    steps: [
      en ? "Shipments created" : "Envíos creados",
      en ? "Shipped" : "Enviados",
      en ? "Delivered" : "Entregados",
      en ? "Closed by the customer" : "Cerrados por el cliente",
      en ? "With a review" : "Con reseña",
    ],
    cancelled: en ? "Cancelled" : "Cancelados",
    times: en ? "Times and punctuality" : "Tiempos y puntualidad",
    prepare: en ? "Average preparation" : "Preparación promedio",
    transit: en ? "Average in transit" : "En tránsito promedio",
    close: en ? "Average until the customer closes it" : "Hasta que el cliente lo cierra",
    onTime: en ? "Shipped on time" : "Enviados a tiempo",
    onTimeHint: en ? "Within 24 hours of the payment" : "Dentro de las 24 horas del pago",
    overdue: en ? "Overdue right now" : "Atrasados ahora",
    returns: en ? "Returns by reason" : "Devoluciones por motivo",
    noReturns: en ? "No returns in this period." : "Sin devoluciones en este periodo.",
    sellers: en ? "By seller" : "Por vendedor",
    seller: en ? "Seller" : "Vendedor",
    shipments: en ? "Shipments" : "Envíos",
    ontimeCol: en ? "On time" : "A tiempo",
    transitCol: en ? "Transit (h)" : "Tránsito (h)",
    returnsCol: en ? "Returns" : "Devol.",
    rating: en ? "Rating" : "Calif.",
    payouts: en ? "Commission and payouts (simulated)" : "Comisión y pagos (simulados)",
    commission: en ? "Commission kept" : "Comisión cobrada",
    paid: en ? "Sales paid out" : "Ventas pagadas",
    count: en ? "Payouts" : "Pagos",
    export: en ? "Download CSV" : "Descargar CSV",
    csvSummary: en ? "Summary" : "Resumen",
    csvSellers: en ? "Sellers" : "Vendedores",
    csvReturns: en ? "Returns" : "Devoluciones",
  };

  const hours = (value: number | null | undefined) => (value == null ? "—" : `${value} h`);
  const pct = (value: number | null) => (value == null ? "—" : `${value}%`);

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.intro}</p>

      <nav className="mt-4 flex flex-wrap items-center gap-1.5" aria-label={t.period}>
        {PERIODS.map((value) => (
          <Link
            key={value}
            href={`/admin/cumplimiento?dias=${value}`}
            className={`rounded-full border px-3 py-1 text-xs ${value === days ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {t.period} {value} {t.daysWord}
          </Link>
        ))}
      </nav>

      {!report ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-medium">{t.funnel}</h2>
            <ol className="mt-3 grid max-w-2xl gap-2">
              {[report.funnel.shipments, report.funnel.shipped, report.funnel.delivered, report.funnel.completed, report.funnel.reviewed].map(
                (value, index, all) => {
                  const rate = index === 0 ? null : stepRate(value, all[index - 1]);
                  const width = all[0] === 0 ? 0 : Math.round((100 * value) / all[0]);
                  return (
                    <li key={t.steps[index]} className="text-sm">
                      <div className="flex justify-between">
                        <span>{t.steps[index]}</span>
                        <span className="font-medium">
                          {value}
                          {rate != null ? <span className="font-normal text-muted-foreground"> ({rate}%)</span> : null}
                        </span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                      </div>
                    </li>
                  );
                }
              )}
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              {t.cancelled}: {report.funnel.cancelled}
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium">{t.times}</h2>
            <div className="mt-3 grid max-w-4xl grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat label={t.prepare} value={hours(report.timing.avg_prepare_hours)} />
              <Stat label={t.transit} value={hours(report.timing.avg_transit_hours)} />
              <Stat label={t.close} value={hours(report.timing.avg_close_hours)} />
              <Stat label={t.onTime} value={pct(onTimePercent(report.timing))} hint={t.onTimeHint} />
              <Stat label={t.overdue} value={String(report.timing.overdue_now)} />
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-medium">{t.returns}</h2>
            {report.returns.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t.noReturns}</p>
            ) : (
              <ul className="mt-3 max-w-md divide-y rounded-lg border text-sm">
                {report.returns.map((item) => (
                  <li key={item.reason} className="flex justify-between px-4 py-2">
                    <span>{reasonLabel(item.reason, locale)}</span>
                    <span className="font-medium">{item.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {report.vendors.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-lg font-medium">{t.sellers}</h2>
              <div className="mt-3 max-w-4xl overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">{t.seller}</th>
                      <th className="px-3 py-2">{t.shipments}</th>
                      <th className="px-3 py-2">{t.ontimeCol}</th>
                      <th className="px-3 py-2">{t.transitCol}</th>
                      <th className="px-3 py-2">{t.cancelled}</th>
                      <th className="px-3 py-2">{t.returnsCol}</th>
                      <th className="px-3 py-2">{t.rating}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.vendors.map((vendor) => (
                      <tr key={vendor.vendor_id ?? "platform"} className="border-t">
                        <td className="px-3 py-2 font-medium">{vendor.name}</td>
                        <td className="px-3 py-2">{vendor.shipments}</td>
                        <td className="px-3 py-2">{pct(vendor.on_time_pct ?? null)}</td>
                        <td className="px-3 py-2">{vendor.avg_transit_hours ?? "—"}</td>
                        <td className="px-3 py-2">{vendor.cancelled}</td>
                        <td className="px-3 py-2">{vendor.returns}</td>
                        <td className="px-3 py-2">{vendor.avg_rating != null ? Number(vendor.avg_rating).toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="mt-8">
            <h2 className="text-lg font-medium">{t.payouts}</h2>
            <div className="mt-3 grid max-w-2xl grid-cols-3 gap-3">
              <Stat label={t.count} value={String(report.payouts.payouts)} />
              <Stat label={t.paid} value={formatPrice(report.payouts.gross_mxn_cents, "MXN", locale)} />
              <Stat label={t.commission} value={formatPrice(report.payouts.commission_mxn_cents, "MXN", locale)} />
            </div>
          </section>

          <section className="mt-8 pb-10">
            <h2 className="text-lg font-medium">{t.export}</h2>
            <p className="mt-2 flex flex-wrap gap-4 text-sm">
              {([
                ["resumen", t.csvSummary],
                ["vendedores", t.csvSellers],
                ["devoluciones", t.csvReturns],
              ] as const).map(([kind, label]) => (
                <a key={kind} href={`/api/reports/fulfillment?tipo=${kind}&days=${days}`} className="font-medium underline underline-offset-4" download>
                  {label}
                </a>
              ))}
            </p>
          </section>
        </>
      )}
    </main>
  );
}
