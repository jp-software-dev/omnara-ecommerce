"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";

// What a visitor sees when something fails while a page renders. Server-side failures are
// already written to the hosting provider's runtime logs; the digest shown here is the key to
// find that line.
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const { locale } = useParams<{ locale?: string }>();
  const en = locale === "en";
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">{en ? "Something went wrong" : "Algo salió mal"}</h1>
      <p className="text-muted-foreground">
        {en
          ? "We could not load this page. You can try again; your bag is safe."
          : "No pudimos cargar esta página. Puedes intentar de nuevo; tu carrito está a salvo."}
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">
          {en ? "Error code" : "Código del error"}: {error.digest}
        </p>
      ) : null}
      <Button className="mt-2" onClick={() => retry()}>
        {en ? "Try again" : "Intentar de nuevo"}
      </Button>
    </main>
  );
}
