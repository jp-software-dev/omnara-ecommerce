export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === "en";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <p className="mb-6 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        {en
          ? "Sample document for demo purposes — Omnara never processes a real charge."
          : "Documento de ejemplo para fines demostrativos — Omnara nunca procesa un cargo real."}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        {en ? "Terms of service" : "Términos de servicio"}
      </h1>
      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          {en
            ? "By using this site you agree to browse and purchase (in Stripe test mode only) subject to these terms."
            : "Al usar este sitio aceptas navegar y comprar (únicamente en modo de prueba de Stripe) sujeto a estos términos."}
        </p>
        <p>
          {en
            ? "All orders are simulated. No real payment is ever collected, and no real product is shipped."
            : "Todos los pedidos son simulados. Nunca se cobra un pago real ni se envía un producto real."}
        </p>
        <p>
          {en
            ? "Account information you provide is used only to operate this demo storefront."
            : "La información de cuenta que proporcionas se usa únicamente para operar esta tienda de demostración."}
        </p>
      </div>
    </main>
  );
}
