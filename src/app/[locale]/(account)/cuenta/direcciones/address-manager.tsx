"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAddressLine, type SavedAddress } from "@/lib/addresses";
import { deleteAddress, saveAddress, setDefaultAddress } from "./actions";

type FormState = {
  id?: string;
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: "MX" | "US";
  makeDefault: boolean;
};

const EMPTY: FormState = {
  label: "",
  recipientName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "MX",
  makeDefault: false,
};

function toForm(address: SavedAddress): FormState {
  return {
    id: address.id,
    label: address.label ?? "",
    recipientName: address.recipient_name,
    phone: address.phone ?? "",
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state,
    postalCode: address.postal_code,
    country: address.country === "US" ? "US" : "MX",
    makeDefault: address.is_default,
  };
}

export function AddressManager({
  addresses,
  locale,
  limit,
}: {
  addresses: SavedAddress[];
  locale: string;
  limit: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const en = locale === "en";

  const t = {
    empty: en ? "You have no saved addresses yet." : "Todavía no tienes direcciones guardadas.",
    add: en ? "Add address" : "Agregar dirección",
    full: en ? `You reached the limit of ${limit} addresses.` : `Llegaste al límite de ${limit} direcciones.`,
    default: en ? "Default" : "Predeterminada",
    makeDefault: en ? "Make default" : "Hacer predeterminada",
    edit: en ? "Edit" : "Editar",
    remove: en ? "Delete" : "Eliminar",
    confirmRemove: en ? "Delete this address?" : "¿Eliminar esta dirección?",
    save: en ? "Save address" : "Guardar dirección",
    cancel: en ? "Cancel" : "Cancelar",
    label: en ? "Name for this address (e.g. Home)" : "Nombre de la dirección (ej. Casa)",
    recipient: en ? "Recipient" : "Quién recibe",
    phone: en ? "Phone (optional)" : "Teléfono (opcional)",
    line1: en ? "Street and number" : "Calle y número",
    line2: en ? "Apartment, reference (optional)" : "Interior, referencias (opcional)",
    city: en ? "City" : "Ciudad",
    state: en ? "State" : "Estado",
    postal: en ? "Postal code" : "Código postal",
    country: en ? "Country" : "País",
    defaultCheck: en ? "Use as my default address" : "Usar como mi dirección predeterminada",
    saved: en ? "Address saved." : "Dirección guardada.",
  };

  function run(action: () => Promise<void>, success?: string) {
    startTransition(async () => {
      try {
        await action();
        if (success) toast.success(success);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    startTransition(async () => {
      try {
        await saveAddress(form);
        toast.success(t.saved);
        setForm(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((current) => (current ? { ...current, [key]: event.target.value } : current));

  return (
    <div>
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="grid gap-3">
          {addresses.map((address) => (
            <li key={address.id} className="rounded-lg border p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {address.label ? `${address.label} · ` : ""}
                    {address.recipient_name}
                    {address.is_default ? (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {t.default}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-muted-foreground">{formatAddressLine(address)}</p>
                  {address.phone ? <p className="text-muted-foreground">{address.phone}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {address.is_default ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={pending}
                      onClick={() => run(() => setDefaultAddress(address.id))}
                    >
                      {t.makeDefault}
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="xs" disabled={pending} onClick={() => setForm(toForm(address))}>
                    {t.edit}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="xs"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm(t.confirmRemove)) run(() => deleteAddress(address.id));
                    }}
                  >
                    {t.remove}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {form ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label={t.label} placeholder={t.label} maxLength={30} value={form.label} onChange={set("label")} />
            <Input aria-label={t.recipient} placeholder={t.recipient} maxLength={60} required value={form.recipientName} onChange={set("recipientName")} />
          </div>
          <Input aria-label={t.line1} placeholder={t.line1} maxLength={80} required value={form.line1} onChange={set("line1")} />
          <Input aria-label={t.line2} placeholder={t.line2} maxLength={80} value={form.line2} onChange={set("line2")} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input aria-label={t.city} placeholder={t.city} maxLength={50} required value={form.city} onChange={set("city")} />
            <Input aria-label={t.state} placeholder={t.state} maxLength={50} required value={form.state} onChange={set("state")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input aria-label={t.postal} placeholder={t.postal} maxLength={10} required value={form.postalCode} onChange={set("postalCode")} />
            <select
              aria-label={t.country}
              value={form.country}
              onChange={set("country")}
              className="h-9 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30"
            >
              <option value="MX" className="text-foreground">México</option>
              <option value="US" className="text-foreground">United States</option>
            </select>
            <Input aria-label={t.phone} placeholder={t.phone} maxLength={20} value={form.phone} onChange={set("phone")} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.makeDefault}
              onChange={(event) => setForm({ ...form, makeDefault: event.target.checked })}
            />
            {t.defaultCheck}
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {t.save}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setForm(null)}>
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : addresses.length >= limit ? (
        <p className="mt-4 text-sm text-muted-foreground">{t.full}</p>
      ) : (
        <Button type="button" variant="outline" className="mt-4" onClick={() => setForm({ ...EMPTY })}>
          {t.add}
        </Button>
      )}
    </div>
  );
}
