import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWishlistProducts } from "@/lib/supabase/queries";
import { ProductCard } from "@/components/shop/product-card";
import { Heart } from "lucide-react";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  const wishlist = await getWishlistProducts(user.id);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {locale === "en" ? "My account" : "Mi cuenta"}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {profile?.full_name ? `${profile.full_name} · ` : ""}
        {user.email}
      </p>

      <section className="mt-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Heart className="size-5" />
          {locale === "en" ? "Wishlist" : "Favoritos"}
        </h2>

        {wishlist.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {locale === "en"
              ? "Tap the heart on any product to save it here."
              : "Toca el corazón en cualquier producto para guardarlo aquí."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {wishlist.map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
