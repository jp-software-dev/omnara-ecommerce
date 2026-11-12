import { z } from "zod";

// Server-side validation for the admin/vendor forms. The browser already limits
// most of this, but anything a form sends can be forged, so every action parses
// its input here before touching the database. Messages are shown to the user.

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const slug = z
  .string()
  .trim()
  .min(2, "El slug debe tener al menos 2 caracteres.")
  .max(80, "El slug es demasiado largo (máximo 80).")
  .regex(SLUG_RE, "El slug solo puede tener minúsculas, números y guiones.");

export const productSchema = z.object({
  slug,
  nameEs: z.string().trim().min(2, "El nombre en español es obligatorio.").max(120, "El nombre es demasiado largo (máximo 120)."),
  nameEn: z.string().trim().min(2, "El nombre en inglés es obligatorio.").max(120, "El nombre es demasiado largo (máximo 120)."),
  basePriceMxnCents: z
    .number("El precio no es válido.")
    .int("El precio no es válido.")
    .min(1, "El precio debe ser mayor a 0.")
    .max(100_000_000, "El precio es demasiado alto."),
  categoryId: z.string().uuid("La categoría no es válida.").nullable(),
  status: z.enum(["active", "draft", "archived"], "El estado no es válido."),
  // Category-specific specs (material, brand, ...): short text values, a handful of keys.
  attributes: z
    .record(z.string(), z.string().trim().max(200, "Una característica es demasiado larga (máximo 200)."))
    .superRefine((value, ctx) => {
      const keys = Object.keys(value);
      if (keys.length > 20) {
        ctx.addIssue({ code: "custom", message: "Demasiadas características (máximo 20)." });
      }
      if (keys.some((key) => !/^[\p{L}\p{N}_]{1,40}$/u.test(key))) {
        ctx.addIssue({ code: "custom", message: "Una característica tiene un nombre no válido." });
      }
    }),
});

export const productUpdateSchema = productSchema.omit({ slug: true });

const businessText = {
  name: z.string().trim().min(2, "El nombre del negocio debe tener al menos 2 caracteres.").max(80, "El nombre del negocio es demasiado largo (máximo 80)."),
  description: z.string().trim().max(500, "La descripción es demasiado larga (máximo 500)."),
  logoUrl: z.string().trim().max(500, "La URL del logo es demasiado larga."),
  bannerUrl: z.string().trim().max(500, "La URL del banner es demasiado larga."),
};

export const businessCreateSchema = z.object({
  ownerId: z.string().uuid("El dueño no es válido."),
  slug: slug.max(60, "El slug es demasiado largo (máximo 60)."),
  ...businessText,
});

export const businessUpdateSchema = z.object({ ...businessText, isActive: z.boolean() });
export const myBusinessUpdateSchema = z.object(businessText);

export const promoSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{3,30}$/, "El código debe tener de 3 a 30 letras, números, guiones o guiones bajos."),
    discountType: z.enum(["percentage", "fixed"], "El tipo de descuento no es válido."),
    discountValue: z.number("El valor del descuento no es válido."),
    minOrderCents: z.number().int("El pedido mínimo no es válido.").min(0, "El pedido mínimo no puede ser negativo.").max(100_000_000, "El pedido mínimo es demasiado alto."),
    usageLimit: z.number().int("El límite de usos no es válido.").min(1, "El límite de usos debe ser al menos 1.").max(1_000_000, "El límite de usos es demasiado alto.").nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.discountType === "percentage") {
      if (!(value.discountValue > 0 && value.discountValue <= 100)) {
        ctx.addIssue({ code: "custom", path: ["discountValue"], message: "El porcentaje debe estar entre 0 y 100." });
      }
    } else if (!Number.isInteger(value.discountValue) || value.discountValue < 1 || value.discountValue > 10_000_000) {
      ctx.addIssue({ code: "custom", path: ["discountValue"], message: "El monto fijo no es válido." });
    }
  });

/** Parses `input` or throws an Error whose message is the first problem found. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }
  return parsed.data;
}
