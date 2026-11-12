import { Badge } from "@/components/ui/badge";
import { AnswerQuestionForm } from "@/components/shop/question-forms";
import { Link } from "@/i18n/navigation";
import { pickLocale } from "@/lib/format";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { getQuestionsForRole } from "@/lib/supabase/queries";
import { HideQuestionButton } from "./hide-button";

export default async function AdminQuestionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";
  const { role, user } = await requireRole(["admin", "vendor"], locale);

  const questions = await getQuestionsForRole(role === "admin" ? "admin" : "vendor", user.id);
  const unanswered = questions.filter((q) => !q.answer && !q.is_hidden).length;

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{en ? "Questions" : "Preguntas"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {role === "admin"
          ? en
            ? "Questions from every product. Hiding one removes it from the store without deleting it."
            : "Preguntas de todos los productos. Ocultar una la quita de la tienda sin borrarla."
          : en
            ? "Questions about your products. Unanswered ones come first."
            : "Preguntas sobre tus productos. Primero las que no tienen respuesta."}{" "}
        <span className="font-medium text-foreground">
          {unanswered} {en ? "unanswered" : "sin responder"}
        </span>
      </p>

      {questions.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {en ? "There are no questions yet." : "Todavía no hay preguntas."}
        </p>
      ) : (
        <ul className="mt-6 grid max-w-3xl gap-3">
          {questions.map((item) => (
            <li key={item.id} className={`rounded-lg border p-4 text-sm ${item.is_hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{item.question}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {item.products ? (
                      <Link href={`/producto/${item.products.slug}`} className="underline underline-offset-4">
                        {pickLocale(item.products.name, locale)}
                      </Link>
                    ) : null}{" "}
                    · {new Date(item.created_at).toLocaleDateString(en ? "en-US" : "es-MX")}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {item.is_hidden ? <Badge variant="destructive">{en ? "Hidden" : "Oculta"}</Badge> : null}
                  {!item.answer ? <Badge variant="secondary">{en ? "Unanswered" : "Sin responder"}</Badge> : null}
                  {role === "admin" ? (
                    <HideQuestionButton questionId={item.id} hidden={item.is_hidden} locale={locale} />
                  ) : null}
                </span>
              </div>
              {item.answer ? (
                <p className="mt-2 border-l-2 pl-3 text-muted-foreground">
                  <span className="whitespace-pre-wrap">{item.answer}</span>
                </p>
              ) : null}
              <div className="mt-2">
                <AnswerQuestionForm questionId={item.id} initialAnswer={item.answer} locale={locale} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
