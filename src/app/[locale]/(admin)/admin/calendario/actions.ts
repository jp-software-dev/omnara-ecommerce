"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calendarSchema, holidaySchema, stepRuleSchema } from "@/lib/calendar-config";
import { createClient } from "@/lib/supabase/server";

// The delivery calendar and the step timings are configuration rows. Row-level security lets
// only an administrator change them; these actions validate and give readable errors.

function done() {
  revalidatePath("/[locale]/(admin)/admin/calendario", "page");
  revalidatePath("/[locale]/(admin)/admin/envios", "page");
}

function firstIssue(error: z.ZodError): never {
  throw new Error(error.issues[0]?.message ?? "Los datos no son válidos.");
}

export async function updateCalendar(input: { businessStart: string; businessEnd: string; workingDays: number[] }) {
  const parsed = calendarSchema.safeParse(input);
  if (!parsed.success) firstIssue(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipping_calendar")
    .update({
      business_start: parsed.data.businessStart,
      business_end: parsed.data.businessEnd,
      working_days: [...parsed.data.workingDays].sort((a, b) => a - b),
    })
    .eq("id", 1)
    .select("id");
  if (error || !data || data.length === 0) throw new Error("No se pudo guardar el horario (¿eres administrador?).");
  done();
}

export async function addHoliday(input: { day: string; name: string }) {
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) firstIssue(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("mx_holidays").insert({ day: parsed.data.day, name: parsed.data.name });
  if (error) {
    throw new Error(error.code === "23505" ? "Ese día ya está en la lista." : "No se pudo agregar el día festivo.");
  }
  done();
}

export async function deleteHoliday(day: string) {
  const parsed = holidaySchema.shape.day.safeParse(day);
  if (!parsed.success) firstIssue(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase.from("mx_holidays").delete().eq("day", parsed.data).select("day");
  if (error || !data || data.length === 0) throw new Error("No se pudo quitar el día festivo.");
  done();
}

export async function updateStepRule(input: { status: string; offsetMinutes: number; businessHoursOnly: boolean }) {
  const parsed = stepRuleSchema.safeParse(input);
  if (!parsed.success) firstIssue(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shipment_step_rules")
    .update({ offset_minutes: parsed.data.offsetMinutes, business_hours_only: parsed.data.businessHoursOnly })
    .eq("status", parsed.data.status)
    .select("status");
  if (error || !data || data.length === 0) throw new Error("No se pudo guardar el tiempo de este paso.");
  done();
}
