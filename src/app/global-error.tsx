"use client";

// The last safety net: it replaces the whole page when the root layout itself fails, so it
// brings its own <html> and <body> and uses no component of the app.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="es">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h1>Algo salió mal / Something went wrong</h1>
        <p>No pudimos cargar Omnara. Intenta de nuevo. / We could not load Omnara. Please try again.</p>
        {error.digest ? <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Código / Code: {error.digest}</p> : null}
        <button type="button" onClick={() => retry()} style={{ padding: "0.5rem 1rem", marginTop: "1rem" }}>
          Reintentar / Retry
        </button>
      </body>
    </html>
  );
}
