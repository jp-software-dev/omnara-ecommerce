import { minutesLabel } from "@/lib/calendar-config";
import { shipmentStepLabel } from "@/lib/shipping";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { HolidayManager, HoursForm, StepRuleRow } from "./calendar-forms";

const ORDER = ["preparing", "shipped", "in_transit", "arrived_state", "out_for_delivery", "delivered"];

export default async function AdminCalendarPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  await requireRole(["admin"], locale);
  const en = locale === "en";

  const supabase = await createClient();
  const [{ data: calendar }, { data: holidays }, { data: rules }] = await Promise.all([
    supabase.from("shipping_calendar").select("timezone, business_start, business_end, working_days").eq("id", 1).single(),
    supabase.from("mx_holidays").select("day, name").order("day"),
    supabase.from("shipment_step_rules").select("status, from_status, offset_minutes, business_hours_only"),
  ]);

  const sortedRules = [...(rules ?? [])].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status));
  const t = {
    title: en ? "Delivery calendar" : "Calendario de entregas",
    intro: en
      ? "Shipments follow real time: each step happens a set time after the previous one, and the carrier steps only happen while the carrier works. Changes apply to the steps that have not happened yet."
      : "Los envíos siguen el tiempo real: cada paso ocurre un tiempo fijo después del anterior, y los pasos de la paquetería solo ocurren mientras ella trabaja. Los cambios se aplican a los pasos que todavía no han ocurrido.",
    hours: en ? "Carrier hours" : "Horario de la paquetería",
    zone: en ? "Time zone" : "Zona horaria",
    steps: en ? "Time between steps" : "Tiempo entre pasos",
    promise: en
      ? "Shipping is the 24-hour promise (1440 minutes after the payment): changing it changes what customers are told."
      : "El envío es la promesa de 24 horas (1440 minutos después del pago): cambiarla cambia lo que se le dice al cliente.",
    holidays: en ? "Holidays (no deliveries)" : "Días festivos (sin entregas)",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t.intro}</p>

      {calendar ? (
        <section className="mt-8">
          <h2 className="text-lg font-medium">{t.hours}</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            {t.zone}: {calendar.timezone}
          </p>
          <HoursForm
            locale={locale}
            initial={{ start: calendar.business_start.slice(0, 5), end: calendar.business_end.slice(0, 5), days: calendar.working_days }}
          />
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-lg font-medium">{t.steps}</h2>
        <p className="mb-3 max-w-3xl text-xs text-muted-foreground">{t.promise}</p>
        <ul className="max-w-3xl divide-y rounded-lg border">
          {sortedRules.map((rule) => (
            <StepRuleRow
              key={rule.status}
              locale={locale}
              status={rule.status}
              label={`${shipmentStepLabel(rule.status, locale)} (${minutesLabel(rule.offset_minutes)})`}
              from={shipmentStepLabel(rule.from_status, locale)}
              initialMinutes={rule.offset_minutes}
              initialBusiness={rule.business_hours_only}
              fixed={rule.status === "shipped"}
            />
          ))}
        </ul>
      </section>

      <section className="mt-10 pb-10">
        <h2 className="mb-3 text-lg font-medium">{t.holidays}</h2>
        <HolidayManager locale={locale} holidays={holidays ?? []} />
      </section>
    </main>
  );
}
