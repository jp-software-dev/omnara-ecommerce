"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { useWishlistStore } from "@/stores/wishlist-store";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  locale,
  className,
}: {
  productId: string;
  locale: string;
  className?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [pop, setPop] = useState(false);
  // One shared load for every heart on the page (see wishlist-store).
  const isFavorite = useWishlistStore((state) => state.ids.includes(productId));

  useEffect(() => {
    void useWishlistStore.getState().load();
  }, []);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
    // Loaded only when someone presses a heart, not with the first JavaScript of the page.
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      toast(
        locale === "en"
          ? "Sign in to save items to your wishlist."
          : "Inicia sesión para guardar tus favoritos."
      );
      router.push("/login");
      return;
    }

    if (isFavorite) {
      await supabase
        .from("wishlists")
        .delete()
        .eq("product_id", productId)
        .eq("user_id", user.id);
      useWishlistStore.getState().setFavorite(productId, false);
    } else {
      await supabase.from("wishlists").insert({ product_id: productId, user_id: user.id });
      useWishlistStore.getState().setFavorite(productId, true);
      setPop(true);
      setTimeout(() => setPop(false), 280);
    }
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={
        isFavorite
          ? locale === "en"
            ? "Remove from wishlist"
            : "Quitar de favoritos"
          : locale === "en"
            ? "Add to wishlist"
            : "Agregar a favoritos"
      }
      aria-pressed={isFavorite}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background disabled:opacity-60",
        className
      )}
    >
      <Heart
        className={cn(
          "size-4.5 text-foreground transition-colors",
          isFavorite && "fill-red-500 text-red-500",
          pop && "animate-heart-pop"
        )}
      />
    </button>
  );
}
