import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { PayoutButton } from "./payout-button";

type Balance = {
  gross_mxn_cents: number;
  commission_mxn_cents: number;
  net_mxn_cents: number;
  commission_bps: number;
  items: number;
};

export default async function PayoutsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  const { role, user } = await requireRole(["admin", "vendor"], locale);
  const supabase = await createClient();
  const money = (cents: number) => formatPrice(cents, "MXN", locale);

  // Admin: every seller with something owed. Vendor: only themselves.
  let vendorIds: string[];
  if (role === "admin") {
    const { data } = await supabase.from("businesses").select("owner_id");
    vendorIds = [...new Set((data ?? []).map((b) => b.owner_id))];
  } else {
    vendorIds = [user.id];
  }

  const { data: profiles } = vendorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", vendorIds)
    : { data: [] };
  const { data: businesses } = vendorIds.length
    ? await supabase.from("businesses").select("owner_id, name").in("owner_id", vendorIds)
    : { data: [] };
  const names = new Map((businesses ?? []).map((b) => [b.owner_id, b.name]));
  const people = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows = await Promise.all(
    vendorIds.map(async (id) => {
      const { data } = await supabase.rpc("seller_balance", { p_vendor: id });
      return { id, balance: (data ?? null) as Balance | null };
    })
  );

  const { data: payouts } = await supabase
    .from("seller_payouts")
    .select("id, vendor_id, gross_mxn_cents, commission_mxn_cents, net_mxn_cents, commission_bps, items_count, reference, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const bps = rows.find((r) => r.balance)?.balance?.commission_bps ?? 300;

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{en ? "Seller payouts" : "Pagos a vendedores"}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {en
          ? `Omnara keeps a ${bps / 100}% commission on each shipped item. Payouts are SIMULATED (educational demo): they only record the ledger entry, no money moves. Items with an open or refunded return are not included.`
          : `Omnara se queda con una comisión de ${bps / 100}% por cada artículo enviado. Los pagos son SIMULADOS (demostración educativa): solo registran el movimiento, no se mueve dinero. No se incluyen artículos con una devolución abierta o reembolsada.`}
      </p>

      <h2 className="mt-8 text-lg font-medium">{en ? "Owed now" : "Por pagar ahora"}</h2>
      <ul className="mt-3 max-w-3xl divide-y rounded-lg border">
        {rows.map(({ id, balance }) => (
          <li key={id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{names.get(id) ?? people.get(id) ?? id.slice(0, 8)}</p>
              <p className="text-muted-foreground">
                {balance && balance.items > 0
                  ? en
                    ? `${balance.items} item(s) · sales ${money(balance.gross_mxn_cents)} · commission ${money(balance.commission_mxn_cents)}`
                    : `${balance.items} artículo(s) · ventas ${money(balance.gross_mxn_cents)} · comisión ${money(balance.commission_mxn_cents)}`
                  : en
                    ? "Nothing to pay out yet."
                    : "Nada por pagar todavía."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{money(balance?.net_mxn_cents ?? 0)}</span>
              {role === "admin" && balance && balance.items > 0 ? (
                <PayoutButton vendorId={id} amountLabel={money(balance.net_mxn_cents)} locale={locale} />
              ) : null}
            </div>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="p-4 text-sm text-muted-foreground">{en ? "No sellers yet." : "Todavía no hay vendedores."}</li>
        ) : null}
      </ul>

      <h2 className="mt-8 text-lg font-medium">{en ? "History" : "Historial"}</h2>
      {(payouts ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{en ? "No payouts yet." : "Todavía no hay pagos."}</p>
      ) : (
        <ul className="mt-3 max-w-3xl divide-y rounded-lg border">
          {(payouts ?? []).map((payout) => (
            <li key={payout.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{payout.reference}</p>
                <p className="text-muted-foreground">
                  {names.get(payout.vendor_id) ?? ""} · {new Date(payout.created_at).toLocaleDateString(locale)} ·{" "}
                  {en ? `${payout.items_count} item(s)` : `${payout.items_count} artículo(s)`} ·{" "}
                  {en ? "commission" : "comisión"} {money(payout.commission_mxn_cents)}
                </p>
              </div>
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{en ? "Simulated" : "Simulado"}</Badge>
                <span className="font-semibold">{money(payout.net_mxn_cents)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
