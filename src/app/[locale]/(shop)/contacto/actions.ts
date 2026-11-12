"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { verifyCaptcha } from "@/lib/captcha";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre.").max(80, "El nombre es demasiado largo (máximo 80)."),
  email: z.string().trim().max(120, "El correo es demasiado largo.").pipe(z.email("Escribe un correo válido.")),
  subject: z.string().trim().max(120, "El asunto es demasiado largo (máximo 120).").optional(),
  message: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más (mínimo 10 caracteres).")
    .max(2000, "El mensaje es demasiado largo (máximo 2000)."),
  // Honeypot: real people never see or fill this field; naive bots fill every input.
  website: z.string().optional(),
  captchaToken: z.string().optional(),
});

export async function sendContactMessage(input: z.input<typeof contactSchema>, locale: string) {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  const data = parsed.data;

  // A bot filled the hidden field: answer as if it worked, store nothing.
  if (data.website) return;

  // No-op until the Turnstile keys are configured; then a valid token is required.
  if (!(await verifyCaptcha(data.captchaToken))) {
    throw new Error(
      locale === "en"
        ? "We couldn't verify you're human. Please try again."
        : "No pudimos verificar que eres una persona. Intenta de nuevo."
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_contact_message", {
    p_name: data.name,
    p_email: data.email,
    p_subject: data.subject ?? "",
    p_message: data.message,
  });

  if (error) {
    if (error.message.includes("Too many messages")) {
      throw new Error(
        locale === "en"
          ? "You've sent several messages recently. Please try again in an hour."
          : "Has enviado varios mensajes recientemente. Intenta de nuevo en una hora."
      );
    }
    throw new Error(
      locale === "en" ? "We couldn't send your message. Please try again." : "No pudimos enviar tu mensaje. Intenta de nuevo."
    );
  }
}
