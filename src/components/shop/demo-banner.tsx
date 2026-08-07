import { ShieldAlert } from "lucide-react";

export function DemoBanner({ locale }: { locale: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <p>
        {locale === "en" ? (
          <>
            <strong className="font-semibold">Demo store — test mode only.</strong>{" "}
            No real charges are ever made. Use the test card{" "}
            <span className="font-mono">4242 4242 4242 4242</span>, any future
            expiry date, and any CVC.
          </>
        ) : (
          <>
            <strong className="font-semibold">Tienda demo — solo modo de prueba.</strong>{" "}
            Nunca se realizan cargos reales. Usa la tarjeta de prueba{" "}
            <span className="font-mono">4242 4242 4242 4242</span>, cualquier
            fecha de vencimiento futura y cualquier CVC.
          </>
        )}
      </p>
    </div>
  );
}
