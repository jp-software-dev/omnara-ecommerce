import { z } from "zod";

// Validation for the delivery-calendar editor. The database has its own constraints; these give
// readable messages before anything is sent.

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener el formato HH:MM.");

export const calendarSchema = z
  .object({
    businessStart: time,
    businessEnd: time,
    workingDays: z
      .array(z.number().int().min(1).max(7))
      .min(1, "Elige al menos un día laboral.")
      .max(7)
      .refine((days) => new Set(days).size === days.length, "Hay días repetidos."),
  })
  .refine((value) => value.businessStart < value.businessEnd, {
    message: "La hora de inicio debe ser anterior a la de cierre.",
    path: ["businessEnd"],
  });

export const holidaySchema = z.object({
  day: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.")
    .refine((value) => !Number.isNaN(Date.parse(value)), "La fecha no es válida."),
  name: z.string().trim().min(2, "Escribe el nombre del día festivo.").max(80, "El nombre es demasiado largo (máximo 80)."),
});

// a step may take from 0 minutes to 10 days
export const stepRuleSchema = z.object({
  status: z.enum(["preparing", "shipped", "in_transit", "arrived_state", "out_for_delivery", "delivered"]),
  offsetMinutes: z.number("El tiempo debe ser un número.").int("El tiempo debe ser entero.").min(0, "El tiempo no puede ser negativo.").max(14_400, "Máximo 10 días (14400 minutos)."),
  businessHoursOnly: z.boolean(),
});

export const WEEKDAYS: { value: number; es: string; en: string }[] = [
  { value: 1, es: "Lunes", en: "Monday" },
  { value: 2, es: "Martes", en: "Tuesday" },
  { value: 3, es: "Miércoles", en: "Wednesday" },
  { value: 4, es: "Jueves", en: "Thursday" },
  { value: 5, es: "Viernes", en: "Friday" },
  { value: 6, es: "Sábado", en: "Saturday" },
  { value: 7, es: "Domingo", en: "Sunday" },
];

/** "90" -> "1 h 30 min", "1440" -> "1 d", "0" -> "0 min". */
export function minutesLabel(minutes: number): string {
  if (minutes <= 0) return "0 min";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  return [days ? `${days} d` : "", hours ? `${hours} h` : "", mins ? `${mins} min` : ""].filter(Boolean).join(" ");
}
