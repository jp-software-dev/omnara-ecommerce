"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUploadField } from "@/components/admin/image-upload-field";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { updateMyBusiness } from "../actions";

export function MyBusinessForm({
  locale,
  initial,
}: {
  locale: string;
  initial: { name: string; description: string; logoUrl: string; bannerUrl: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [loading, setLoading] = useState(false);

  const t = {
    name: locale === "en" ? "Business name" : "Nombre del negocio",
    description: locale === "en" ? "Description" : "Descripción",
    logo: locale === "en" ? "Logo" : "Logo",
    banner: locale === "en" ? "Banner" : "Banner",
    save: locale === "en" ? "Save changes" : "Guardar cambios",
    saving: locale === "en" ? "Saving..." : "Guardando...",
    success: locale === "en" ? "Business updated." : "Negocio actualizado.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await updateMyBusiness({ name, description, logoUrl, bannerUrl });
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
          <FieldLabel htmlFor="my-business-name">{t.name}</FieldLabel>
          <Input id="my-business-name" value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="my-business-description">{t.description}</FieldLabel>
          <Textarea
            id="my-business-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
        <ImageUploadField
          locale={locale}
          label={t.logo}
          hint={locale === "en" ? "Square image works best." : "Funciona mejor una imagen cuadrada."}
          kind="business-logo"
          value={logoUrl}
          onChange={setLogoUrl}
        />
        <ImageUploadField
          locale={locale}
          label={t.banner}
          hint={locale === "en" ? "Wide image, about 3:1." : "Imagen ancha, aproximadamente 3:1."}
          kind="business-banner"
          value={bannerUrl}
          onChange={setBannerUrl}
          wide
        />
        <Button type="submit" disabled={loading}>
          {loading ? t.saving : t.save}
        </Button>
      </FieldGroup>
    </form>
  );
}
