"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReviewForm({ productId, locale }: { productId: string; locale: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    heading: locale === "en" ? "Write a review" : "Escribe una reseña",
    titlePlaceholder: locale === "en" ? "Title (optional)" : "Título (opcional)",
    commentPlaceholder:
      locale === "en" ? "Share your thoughts (optional)" : "Comparte tu opinión (opcional)",
    submit: locale === "en" ? "Submit review" : "Publicar reseña",
    submitting: locale === "en" ? "Submitting..." : "Publicando...",
    needRating: locale === "en" ? "Choose a rating first." : "Elige una calificación primero.",
    success: locale === "en" ? "Thanks for your review!" : "¡Gracias por tu reseña!",
    duplicate: locale === "en" ? "You already reviewed this product." : "Ya reseñaste este producto.",
    loginRequired: locale === "en" ? "Sign in to leave a review." : "Inicia sesión para dejar una reseña.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      toast.error(t.needRating);
      return;
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error(t.loginRequired);
      router.push("/login");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      title: title.trim() || null,
      comment: comment.trim() || null,
    });
    setLoading(false);

    if (error) {
      toast.error(error.code === "23505" ? t.duplicate : error.message);
      return;
    }

    toast.success(t.success);
    setRating(0);
    setTitle("");
    setComment("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-3 rounded-lg border p-4">
      <p className="text-sm font-medium">{t.heading}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star
              className={`size-5 ${
                n <= rating ? "fill-current text-amber-500" : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={t.titlePlaceholder}
      />
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder={t.commentPlaceholder}
        className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <Button type="submit" disabled={loading}>
        {loading ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
