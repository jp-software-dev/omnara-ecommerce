import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { formatShipmentTime, shipmentStepLabel } from "@/lib/shipping";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { ShipmentActions } from "./shipment-actions";

const FILTERS = ["open", "confirmed", "preparing", "shipped", "in_transit", "arrived_state", "out_for_delivery", "delivered", "completed", "cancelled", "all"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminShipmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ estado?: string }>;
}) {
  const { locale } = await params;
  const { estado } = await searchParams;
  await requireRole(["admin"], locale);
  const en = locale === "en";
  const filter: Filter = (FILTERS as readonly string[]).includes(estado ?? "") ? (estado as Filter) : "open";

  const supabase = await createClient();
  let query = supabase
    .from("shipments")
    .select("id, status, on_hold, hold_reason, delay_minutes, tracking_number, ship_by, created_at, vendor_id, order_id, orders(order_number)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (filter === "open") query = query.not("status", "in", "(completed,cancelled)");
  else if (filter !== "all") query = query.eq("status", filter);
  const { data: shipments } = await query;
  const rows = shipments ?? [];

  const vendorIds = [...new Set(rows.map((row) => row.vendor_id).filter((id): id is string => id !== null))];
  const { data: businesses } = vendorIds.length
    ? await supabase.from("businesses").select("owner_id, name").in("owner_id", vendorIds)
    : { data: [] };
  const names = new Map((businesses ?? []).map((business) => [business.owner_id, business.name]));

  // projected delivery, only for the open ones (one lookup each, so it is capped)
  const open = rows.filter((row) => row.status !== "completed" && row.status !== "cancelled").slice(0, 25);
  const etas = new Map<string, string | null>();
  await Promise.all(
    open.map(async (row) => {
      const { data } = await supabase.rpc("shipment_timeline", { p_shipment: row.id });
      etas.set(row.id, data?.find((step) => step.status === "delivered")?.at ?? null);
    })
  );

  const t = {
    title: en ? "Shipments" : "Envíos",
    intro: en
      ? "Every shipment moves on its own following the calendar. Here you can pause one, force its next step or record an incident that delays it (simulated). The customer is always notified."
      : "Cada envío avanza solo siguiendo el calendario. Aquí puedes pausar uno, forzar su siguiente paso o registrar un incidente que lo retrase (simulado). Al cliente siempre se le avisa.",
    filter: en ? "Show" : "Mostrar",
    open: en ? "Open" : "Abiertos",
    all: en ? "All" : "Todos",
    empty: en ? "There are no shipments in this view." : "No hay envíos en esta vista.",
    order: en ? "Order" : "Pedido",
    seller: en ? "Seller" : "Vendedor",
    shipBy: en ? "Ships by" : "Sale antes de",
    eta: en ? "Estimated delivery" : "Entrega estimada",
    paused: en ? "Paused" : "En pausa",
    delay: en ? "Delay" : "Retraso",
  };
  const label = (value: Filter) => (value === "open" ? t.open : value === "all" ? t.all : shipmentStepLabel(value, locale));

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t.intro}</p>

      <nav aria-label={t.filter} className="mt-4 flex flex-wrap gap-1.5">
        {FILTERS.map((value) => (
          <Link
            key={value}
            href={`/admin/envios?estado=${value}`}
            className={`rounded-full border px-3 py-1 text-xs ${value === filter ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            {label(value)}
          </Link>
        ))}
      </nav>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-6 max-w-5xl divide-y rounded-lg border text-sm">
          {rows.map((row) => {
            const closed = row.status === "completed" || row.status === "cancelled";
            const eta = etas.get(row.id);
            return (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium">
                    <Link href={`/admin/pedidos/${row.order_id}`} className="underline underline-offset-4">
                      {row.orders?.order_number ?? row.order_id.slice(0, 8)}
                    </Link>{" "}
                    <span className="font-normal text-muted-foreground">· {(row.vendor_id && names.get(row.vendor_id)) || "Omnara"}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
                    <Badge variant={closed ? "secondary" : "default"}>{shipmentStepLabel(row.status, locale)}</Badge>
                    {row.on_hold ? <Badge variant="destructive">{t.paused}</Badge> : null}
                    {row.delay_minutes > 0 ? <Badge variant="outline">{t.delay} +{Math.round(row.delay_minutes / 60)} h</Badge> : null}
                    {row.tracking_number ? <span className="font-mono text-xs">{row.tracking_number}</span> : null}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(row.status === "confirmed" || row.status === "preparing") && row.ship_by
                      ? `${t.shipBy}: ${formatShipmentTime(row.ship_by, locale)}`
                      : null}
                    {eta ? `${t.eta}: ${formatShipmentTime(eta, locale)}` : null}
                    {row.on_hold && row.hold_reason ? ` · ${row.hold_reason}` : null}
                  </p>
                </div>
                {closed ? null : (
                  <ShipmentActions
                    shipmentId={row.id}
                    locale={locale}
                    onHold={row.on_hold}
                    canForce={row.status !== "delivered"}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
