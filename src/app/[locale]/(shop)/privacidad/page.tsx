export default async function PrivacyPage({
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
        {en ? "Privacy notice" : "Aviso de privacidad"}
      </h1>
      <div className="mt-6 space-y-4 text-sm text-muted-foreground">
        <p>
          {en
            ? "This demo stores your account data (name, email) and order history in Supabase, protected by row-level security."
            : "Esta demo almacena tus datos de cuenta (nombre, correo) e historial de pedidos en Supabase, protegidos con seguridad a nivel de fila."}
        </p>
        <p>
          {en
            ? "Payment is handled entirely by Stripe in test mode — no card data ever touches our servers."
            : "El pago lo procesa Stripe por completo en modo de prueba — ningún dato de tarjeta pasa por nuestros servidores."}
        </p>
        <p>
          {en
            ? "You can request account deletion at any time by contacting us."
            : "Puedes solicitar la eliminación de tu cuenta en cualquier momento contactándonos."}
        </p>
      </div>
    </main>
  );
}
