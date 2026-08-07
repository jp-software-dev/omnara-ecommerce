import { Star } from "lucide-react";

type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  profiles: { full_name: string | null } | null;
};

export function ProductReviews({ reviews, locale }: { reviews: Review[]; locale: string }) {
  const average = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 0;

  const t = {
    title: locale === "en" ? "Reviews" : "Reseñas",
    empty: locale === "en" ? "No reviews yet." : "Todavía no hay reseñas.",
    verified: locale === "en" ? "Verified purchase" : "Compra verificada",
    anonymous: locale === "en" ? "Anonymous" : "Anónimo",
  };

  return (
    <section>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        {reviews.length > 0 ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Star className="size-4 fill-current text-amber-500" />
            {average.toFixed(1)} ({reviews.length})
          </span>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((review) => (
            <li key={review.id} className="border-b pb-4 last:border-0">
              <div className="flex items-center gap-2">
                <div className="flex text-amber-500">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`size-3.5 ${n <= review.rating ? "fill-current" : ""}`}
                    />
                  ))}
                </div>
                {review.is_verified_purchase ? (
                  <span className="text-xs text-muted-foreground">{t.verified}</span>
                ) : null}
              </div>
              {review.title ? <p className="mt-1 font-medium">{review.title}</p> : null}
              {review.comment ? (
                <p className="mt-1 text-sm text-muted-foreground">{review.comment}</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {review.profiles?.full_name ?? t.anonymous} ·{" "}
                {new Date(review.created_at).toLocaleDateString(
                  locale === "en" ? "en-US" : "es-MX"
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
