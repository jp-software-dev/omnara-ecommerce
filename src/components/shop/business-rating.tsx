import { Star } from "lucide-react";
import type { BusinessRating } from "@/lib/supabase/queries";

// Seller rating: average of the reviews of the business's products.
export function BusinessRatingBadge({
  rating,
  locale,
  className,
}: {
  rating: BusinessRating | undefined;
  locale: string;
  className?: string;
}) {
  const en = locale === "en";

  if (!rating) {
    return (
      <span className={`text-xs text-muted-foreground ${className ?? ""}`}>
        {en ? "No reviews yet" : "Sin reseñas todavía"}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm ${className ?? ""}`}
      title={en ? "Average of the reviews of this seller's products" : "Promedio de las reseñas de los productos de este vendedor"}
    >
      <Star className="size-4 fill-current text-amber-500" aria-hidden />
      <span className="font-medium">{rating.avg.toFixed(1)}</span>
      <span className="text-muted-foreground">
        ({rating.count} {en ? (rating.count === 1 ? "review" : "reviews") : rating.count === 1 ? "reseña" : "reseñas"})
      </span>
    </span>
  );
}
