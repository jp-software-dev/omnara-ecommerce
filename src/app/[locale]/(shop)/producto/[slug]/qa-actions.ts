"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const questionSchema = z.object({
  productId: z.string().uuid(),
  question: z.string().trim().min(5, "La pregunta debe tener al menos 5 caracteres.").max(500, "La pregunta es demasiado larga (máximo 500)."),
});

const answerSchema = z.object({
  questionId: z.string().uuid(),
  answer: z.string().trim().min(1, "Escribe una respuesta.").max(1000, "La respuesta es demasiado larga (máximo 1000)."),
});

// Maps the database's exception messages to something a person can act on.
function qaError(message: string, locale: string) {
  const en = locale === "en";
  if (message.includes("Too many questions")) {
    return en ? "You've asked too many questions. Try again in a while." : "Hiciste muchas preguntas. Intenta de nuevo en un rato.";
  }
  if (message.includes("Only the seller")) {
    return en ? "Only the seller of this product can answer." : "Solo el vendedor de este producto puede responder.";
  }
  if (message.includes("Product not found")) {
    return en ? "This product is no longer available." : "Este producto ya no está disponible.";
  }
  if (message.includes("Not authenticated")) {
    return en ? "Sign in to continue." : "Inicia sesión para continuar.";
  }
  return message;
}

function revalidateQuestions() {
  revalidatePath("/[locale]/(shop)/producto/[slug]", "page");
  revalidatePath("/[locale]/(admin)/admin/preguntas", "page");
}

export async function askQuestion(productId: string, question: string, locale: string) {
  const parsed = questionSchema.safeParse({ productId, question });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("ask_question", {
    p_product_id: parsed.data.productId,
    p_question: parsed.data.question,
  });
  if (error) throw new Error(qaError(error.message, locale));
  revalidateQuestions();
}

// The product's seller or an admin; the database function re-checks who is calling.
export async function answerQuestion(questionId: string, answer: string, locale: string) {
  const parsed = answerSchema.safeParse({ questionId, answer });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("answer_question", {
    p_id: parsed.data.questionId,
    p_answer: parsed.data.answer,
  });
  if (error) throw new Error(qaError(error.message, locale));
  revalidateQuestions();
}
