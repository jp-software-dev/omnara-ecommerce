import { ShieldAlert } from "lucide-react";

// `simulated` = the checkout is running as a simulated payment (no Stripe at all).
export function DemoBanner({ locale, simulated = false }: { locale: string; simulated?: boolean }) {
  if (simulated) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
        <p>
          {locale === "en" ? (
            <>
              <strong className="font-semibold">Simulated payment — educational demo.</strong>{" "}
              No card is needed and no money moves. No product is real or actually sold: this only creates a sample order.
            </>
          ) : (
            <>
              <strong className="font-semibold">Pago simulado — demostración educativa.</strong>{" "}
              No se necesita tarjeta y no se mueve dinero. Ningún producto es real ni se vende realmente: esto solo crea un pedido de ejemplo.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <p>
        {locale === "en" ? (
          <>
            <strong className="font-semibold">Educational demo — test mode only.</strong>{" "}
            No product is real or actually sold, and no real charge is ever made. Use the test card{" "}
            <span className="font-mono">4242 4242 4242 4242</span>, any future
            expiry date, and any CVC.
          </>
        ) : (
          <>
            <strong className="font-semibold">Demostración educativa — solo modo de prueba.</strong>{" "}
            Ningún producto es real ni se vende realmente, y nunca se realizan cargos reales. Usa la tarjeta de prueba{" "}
            <span className="font-mono">4242 4242 4242 4242</span>, cualquier
            fecha de vencimiento futura y cualquier CVC.
          </>
        )}
      </p>
    </div>
  );
}
