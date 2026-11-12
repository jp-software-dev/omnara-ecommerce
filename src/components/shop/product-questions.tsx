import { Link } from "@/i18n/navigation";
import { AnswerQuestionForm, AskQuestionForm } from "./question-forms";

type Question = {
  id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
};

export function ProductQuestions({
  questions,
  productId,
  locale,
  signedIn,
  canAnswer,
}: {
  questions: Question[];
  productId: string;
  locale: string;
  signedIn: boolean;
  /** The product's seller, or an admin. */
  canAnswer: boolean;
}) {
  const en = locale === "en";
  const date = (value: string) => new Date(value).toLocaleDateString(en ? "en-US" : "es-MX");

  return (
    <section>
      <h2 className="text-lg font-semibold">{en ? "Questions and answers" : "Preguntas y respuestas"}</h2>

      {questions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {en ? "No questions yet. Be the first to ask." : "Todavía no hay preguntas. Sé el primero en preguntar."}
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {questions.map((item) => (
            <li key={item.id} className="text-sm">
              <p className="font-medium">{item.question}</p>
              {item.answer ? (
                <p className="mt-1 border-l-2 pl-3 text-muted-foreground">
                  <span className="whitespace-pre-wrap">{item.answer}</span>
                  <span className="mt-0.5 block text-xs">
                    {en ? "Seller's answer" : "Respuesta del vendedor"}
                    {item.answered_at ? ` · ${date(item.answered_at)}` : ""}
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  {en ? "Waiting for the seller's answer." : "Esperando la respuesta del vendedor."}
                </p>
              )}
              {canAnswer ? (
                <div className="mt-2">
                  <AnswerQuestionForm questionId={item.id} initialAnswer={item.answer} locale={locale} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {signedIn ? (
        <AskQuestionForm productId={productId} locale={locale} />
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            {en ? "Sign in" : "Inicia sesión"}
          </Link>{" "}
          {en ? "to ask the seller a question." : "para preguntarle algo al vendedor."}
        </p>
      )}
    </section>
  );
}
