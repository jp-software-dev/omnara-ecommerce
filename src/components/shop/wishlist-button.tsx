"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
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
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pop, setPop] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkInitialState() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (active) setIsFavorite(Boolean(data));
    }

    checkInitialState();
    return () => {
      active = false;
    };
  }, [productId]);

  async function toggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (loading) return;

    setLoading(true);
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
      setIsFavorite(false);
    } else {
      await supabase.from("wishlists").insert({ product_id: productId, user_id: user.id });
      setIsFavorite(true);
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
