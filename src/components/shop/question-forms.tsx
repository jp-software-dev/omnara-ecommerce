"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  answerQuestion,
  askQuestion,
} from "@/app/[locale]/(shop)/producto/[slug]/qa-actions";

export function AskQuestionForm({ productId, locale }: { productId: string; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [question, setQuestion] = useState("");
  const en = locale === "en";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await askQuestion(productId, question, locale);
        setQuestion("");
        toast.success(en ? "Question sent. The seller will answer it." : "Pregunta enviada. El vendedor la responderá.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-2">
      <Textarea
        value={question}
        maxLength={500}
        aria-label={en ? "Your question" : "Tu pregunta"}
        placeholder={en ? "Ask the seller about this product" : "Pregúntale al vendedor sobre este producto"}
        onChange={(event) => setQuestion(event.target.value)}
      />
      <Button type="submit" size="sm" className="justify-self-start" disabled={pending || question.trim().length < 5}>
        {en ? "Ask" : "Preguntar"}
      </Button>
    </form>
  );
}

export function AnswerQuestionForm({
  questionId,
  initialAnswer,
  locale,
}: {
  questionId: string;
  initialAnswer: string | null;
  locale: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(initialAnswer ?? "");
  const en = locale === "en";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await answerQuestion(questionId, answer, locale);
        setOpen(false);
        toast.success(en ? "Answer published." : "Respuesta publicada.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="xs" onClick={() => setOpen(true)}>
        {initialAnswer ? (en ? "Edit answer" : "Editar respuesta") : en ? "Answer" : "Responder"}
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-2 grid gap-2">
      <Textarea
        value={answer}
        maxLength={1000}
        aria-label={en ? "Your answer" : "Tu respuesta"}
        onChange={(event) => setAnswer(event.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !answer.trim()}>
          {en ? "Publish" : "Publicar"}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setOpen(false)}>
          {en ? "Cancel" : "Cancelar"}
        </Button>
      </div>
    </form>
  );
}
