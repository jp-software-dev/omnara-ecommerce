"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEEKDAYS } from "@/lib/calendar-config";
import { addHoliday, deleteHoliday, updateCalendar, updateStepRule } from "./actions";

function useRun(locale: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (task: () => Promise<unknown>) =>
    startTransition(async () => {
      try {
        await task();
        toast.success(locale === "en" ? "Saved." : "Guardado.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  return { pending, run };
}

export function HoursForm({
  locale,
  initial,
}: {
  locale: string;
  initial: { start: string; end: string; days: number[] };
}) {
  const { pending, run } = useRun(locale);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [days, setDays] = useState<number[]>(initial.days);
  const en = locale === "en";

  return (
    <div className="grid max-w-xl gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="grid gap-1 text-sm">
          {en ? "Opens" : "Abre"}
          <Input type="time" value={start} onChange={(event) => setStart(event.target.value)} className="w-32" />
        </label>
        <label className="grid gap-1 text-sm">
          {en ? "Closes" : "Cierra"}
          <Input type="time" value={end} onChange={(event) => setEnd(event.target.value)} className="w-32" />
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-3 text-sm">
        <legend className="mb-1">{en ? "Working days" : "Días laborales"}</legend>
        {WEEKDAYS.map((day) => (
          <label key={day.value} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={days.includes(day.value)}
              onChange={(event) => setDays(event.target.checked ? [...days, day.value] : days.filter((d) => d !== day.value))}
            />
            {en ? day.en : day.es}
          </label>
        ))}
      </fieldset>
      <Button
        type="button"
        size="sm"
        className="justify-self-start"
        disabled={pending}
        onClick={() => run(() => updateCalendar({ businessStart: start, businessEnd: end, workingDays: days }))}
      >
        {en ? "Save hours" : "Guardar horario"}
      </Button>
    </div>
  );
}

export function StepRuleRow({
  locale,
  status,
  label,
  from,
  initialMinutes,
  initialBusiness,
  fixed,
}: {
  locale: string;
  status: string;
  label: string;
  from: string;
  initialMinutes: number;
  initialBusiness: boolean;
  /** The 24-hour shipping promise: shown, but its carrier-hours rule is not editable. */
  fixed: boolean;
}) {
  const { pending, run } = useRun(locale);
  const [minutes, setMinutes] = useState(String(initialMinutes));
  const [business, setBusiness] = useState(initialBusiness);
  const en = locale === "en";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {en ? "measured from" : "se mide desde"}: {from}
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={en ? "Minutes" : "Minutos"}
          type="number"
          min={0}
          max={14400}
          value={minutes}
          onChange={(event) => setMinutes(event.target.value)}
          className="w-24"
        />
        <span className="text-xs text-muted-foreground">min</span>
        <label className="flex items-center gap-1.5 text-xs">
          <input type="checkbox" checked={business} disabled={fixed} onChange={(event) => setBusiness(event.target.checked)} />
          {en ? "carrier hours only" : "solo en horario de paquetería"}
        </label>
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => updateStepRule({ status, offsetMinutes: Number(minutes), businessHoursOnly: business }))}
        >
          {en ? "Save" : "Guardar"}
        </Button>
      </span>
    </li>
  );
}

export function HolidayManager({
  locale,
  holidays,
}: {
  locale: string;
  holidays: { day: string; name: string }[];
}) {
  const { pending, run } = useRun(locale);
  const [day, setDay] = useState("");
  const [name, setName] = useState("");
  const en = locale === "en";

  return (
    <div className="grid max-w-2xl gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">
          {en ? "Date" : "Fecha"}
          <Input type="date" value={day} onChange={(event) => setDay(event.target.value)} className="w-44" />
        </label>
        <label className="grid flex-1 gap-1 text-sm">
          {en ? "Name" : "Nombre"}
          <Input value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        </label>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(async () => {
              await addHoliday({ day, name });
              setDay("");
              setName("");
            })
          }
        >
          {en ? "Add" : "Agregar"}
        </Button>
      </div>
      <ul className="divide-y rounded-lg border text-sm">
        {holidays.map((holiday) => (
          <li key={holiday.day} className="flex items-center justify-between gap-3 px-4 py-2">
            <span>
              <span className="font-mono text-xs text-muted-foreground">{holiday.day}</span> · {holiday.name}
            </span>
            <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => run(() => deleteHoliday(holiday.day))}>
              {en ? "Remove" : "Quitar"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
