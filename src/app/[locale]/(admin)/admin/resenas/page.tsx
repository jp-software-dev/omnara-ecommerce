import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/lib/format";
import { getReviewsForModeration } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { ModerateButton } from "./moderate-button";

export default async function AdminReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const reviews = await getReviewsForModeration();

  const t = {
    title: en ? "Review moderation" : "Moderación de reseñas",
    hint: en
      ? "Hiding a review removes it from the store and from ratings. It is not deleted and can be restored."
      : "Ocultar una reseña la quita de la tienda y de las calificaciones. No se borra y se puede restaurar.",
    empty: en ? "There are no reviews yet." : "Todavía no hay reseñas.",
    hidden: en ? "Hidden" : "Oculta",
    verified: en ? "Verified purchase" : "Compra verificada",
    anonymous: en ? "Anonymous" : "Anónimo",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>

      {reviews.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-3">
          {reviews.map((review) => (
            <li
              key={review.id}
              className={`rounded-lg border p-4 text-sm ${review.is_hidden ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`size-4 ${i < review.rating ? "fill-current text-amber-500" : "text-muted-foreground"}`}
                        />
                      ))}
                    </span>
                    {review.is_verified_purchase ? <Badge variant="secondary">{t.verified}</Badge> : null}
                    {review.is_hidden ? <Badge variant="destructive">{t.hidden}</Badge> : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {review.profiles?.full_name ?? t.anonymous} ·{" "}
                    {review.products ? (
                      <Link
                        href={`/producto/${review.products.slug}`}
                        className="underline underline-offset-4"
                      >
                        {pickLocale(review.products.name, locale)}
                      </Link>
                    ) : null}{" "}
                    · {new Date(review.created_at).toLocaleDateString(en ? "en-US" : "es-MX")}
                  </p>
                </div>
                <ModerateButton reviewId={review.id} hidden={review.is_hidden} locale={locale} />
              </div>
              {review.title ? <p className="mt-2 font-medium">{review.title}</p> : null}
              {review.comment ? <p className="mt-1 whitespace-pre-wrap">{review.comment}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
