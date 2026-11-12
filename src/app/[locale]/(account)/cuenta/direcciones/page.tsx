import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAddresses } from "@/lib/supabase/queries";
import { AddressManager } from "./address-manager";

const ADDRESS_LIMIT = 10;

export default async function AddressesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const addresses = await getMyAddresses(user.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/cuenta"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {en ? "My account" : "Mi cuenta"}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{en ? "My addresses" : "Mis direcciones"}</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        {en
          ? "Save the places you ship to and pick one at checkout instead of typing it again."
          : "Guarda los lugares a los que envías y elige uno al pagar en lugar de escribirlo otra vez."}
      </p>
      <AddressManager addresses={addresses} locale={locale} limit={ADDRESS_LIMIT} />
    </main>
  );
}
