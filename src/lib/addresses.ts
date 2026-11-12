import { z } from "zod";

// Shared by the address book (client + server) and checkout. The limits mirror the
// database checks (supabase/migrations/…_saved_addresses.sql), which are the real
// guard; these just give friendly errors before the round trip.

export const ADDRESS_COUNTRIES = ["MX", "US"] as const;

export const addressSchema = z
  .object({
    id: z.string().uuid().optional(),
    label: z.string().trim().max(30, "La etiqueta es demasiado larga (máximo 30).").optional(),
    recipientName: z
      .string()
      .trim()
      .min(2, "Escribe el nombre de quien recibe.")
      .max(60, "El nombre es demasiado largo (máximo 60)."),
    phone: z.string().trim().max(20, "El teléfono es demasiado largo (máximo 20).").optional(),
    line1: z
      .string()
      .trim()
      .min(3, "Escribe la calle y el número.")
      .max(80, "La calle es demasiado larga (máximo 80)."),
    line2: z.string().trim().max(80, "El complemento es demasiado largo (máximo 80).").optional(),
    city: z.string().trim().min(2, "Escribe la ciudad.").max(50, "La ciudad es demasiado larga (máximo 50)."),
    state: z.string().trim().min(2, "Escribe el estado.").max(50, "El estado es demasiado largo (máximo 50)."),
    postalCode: z.string().trim(),
    country: z.enum(ADDRESS_COUNTRIES),
    makeDefault: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const valid =
      value.country === "MX"
        ? /^[0-9]{5}$/.test(value.postalCode)
        : /^[0-9]{5}(-[0-9]{4})?$/.test(value.postalCode);
    if (!valid) {
      ctx.addIssue({
        code: "custom",
        path: ["postalCode"],
        message:
          value.country === "MX"
            ? "El código postal de México tiene 5 dígitos."
            : "El ZIP de Estados Unidos tiene 5 dígitos (o 5+4).",
      });
    }
  });

export type AddressInput = z.input<typeof addressSchema>;

export type SavedAddress = {
  id: string;
  label: string | null;
  recipient_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

/** One-line summary for lists and the checkout selector. */
export function formatAddressLine(address: SavedAddress) {
  return [address.line1, address.line2, `${address.city}, ${address.state} ${address.postal_code}`, address.country]
    .filter(Boolean)
    .join(", ");
}
