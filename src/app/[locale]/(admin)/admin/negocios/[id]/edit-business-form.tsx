"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { updateBusiness } from "../../actions";

export function EditBusinessForm({
  locale,
  businessId,
  initial,
}: {
  locale: string;
  businessId: string;
  initial: {
    name: string;
    description: string;
    logoUrl: string;
    bannerUrl: string;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [isActive, setIsActive] = useState(initial.isActive);
  const [loading, setLoading] = useState(false);

  const t = {
    name: locale === "en" ? "Business name" : "Nombre del negocio",
    description: locale === "en" ? "Description" : "Descripción",
    logoUrl: locale === "en" ? "Logo URL" : "URL del logo",
    bannerUrl: locale === "en" ? "Banner URL" : "URL del banner",
    active: locale === "en" ? "Active (visible to customers)" : "Activo (visible a clientes)",
    save: locale === "en" ? "Save changes" : "Guardar cambios",
    saving: locale === "en" ? "Saving..." : "Guardando...",
    success: locale === "en" ? "Business updated." : "Negocio actualizado.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await updateBusiness(businessId, { name, description, logoUrl, bannerUrl, isActive });
      toast.success(t.success);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg rounded-lg border p-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="edit-business-name">{t.name}</FieldLabel>
          <Input id="edit-business-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-business-description">{t.description}</FieldLabel>
          <Textarea
            id="edit-business-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-business-logo">{t.logoUrl}</FieldLabel>
          <Input id="edit-business-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="edit-business-banner">{t.bannerUrl}</FieldLabel>
          <Input id="edit-business-banner" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
          {t.active}
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? t.saving : t.save}
        </Button>
      </FieldGroup>
    </form>
  );
}
