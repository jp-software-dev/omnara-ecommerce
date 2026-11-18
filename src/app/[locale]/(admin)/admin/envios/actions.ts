"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Operations on a shipment. Every one goes through a database function that checks the caller is
// an administrator, so nothing here is trusted: this only validates the shape of the input.

const idSchema = z.string().uuid();

function done() {
  revalidatePath("/[locale]/(admin)/admin/envios", "page");
  revalidatePath("/[locale]/(admin)/admin/pedidos", "layout");
}

function fail(): never {
  throw new Error("No se pudo completar la operación sobre el envío.");
}

export async function setShipmentHold(shipmentId: string, onHold: boolean, reason?: string) {
  const id = idSchema.parse(shipmentId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_hold", {
    p_shipment: id,
    p_on_hold: onHold,
    ...(onHold && reason?.trim() ? { p_reason: reason.trim().slice(0, 300) } : {}),
  });
  if (error) fail();
  done();
}

export async function forceNextStep(shipmentId: string) {
  const id = idSchema.parse(shipmentId);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_force_next_step", { p_shipment: id });
  if (error) {
    throw new Error(
      error.message.includes("no next step")
        ? "Este envío ya no tiene un paso siguiente: el cliente es quien lo cierra."
        : "No se pudo forzar el siguiente paso."
    );
  }
  done();
  return data;
}

const incidentSchema = z.object({
  kind: z.enum(["delay", "failed_attempt", "damaged"]),
  note: z.string().trim().max(300, "La nota es demasiado larga (máximo 300).").optional(),
  hours: z.number().int("Las horas deben ser un número entero.").min(1, "Mínimo 1 hora.").max(168, "Máximo 168 horas (7 días)."),
});

export async function addShipmentIncident(
  shipmentId: string,
  input: { kind: string; note?: string; hours?: number }
) {
  const id = idSchema.parse(shipmentId);
  const parsed = incidentSchema.safeParse({ kind: input.kind, note: input.note, hours: input.hours ?? 24 });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Datos no válidos.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_add_incident", {
    p_shipment: id,
    p_kind: parsed.data.kind,
    p_delay_hours: parsed.data.hours,
    ...(parsed.data.note ? { p_note: parsed.data.note } : {}),
  });
  if (error) {
    const known: [string, string][] = [
      ["once the package has shipped", "Eso solo puede pasar cuando el paquete ya salió."],
      ["already delivered", "El paquete ya fue entregado."],
      ["already closed", "El envío ya está cerrado."],
    ];
    const hit = known.find(([needle]) => error.message.includes(needle));
    throw new Error(hit ? hit[1] : "No se pudo registrar el incidente.");
  }
  done();
}
