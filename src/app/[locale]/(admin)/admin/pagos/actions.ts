"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/** Records a SIMULATED payout. The database function checks the caller is an admin. */
export async function createPayout(vendorId: string) {
  const id = z.string().uuid().parse(vendorId);
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_simulated_payout", { p_vendor: id });
  if (error) {
    throw new Error(
      error.message.includes("Nothing to pay out")
        ? "No hay nada por pagar a este vendedor."
        : "No se pudo registrar el pago."
    );
  }
  revalidatePath("/[locale]/admin/pagos", "page");
}
