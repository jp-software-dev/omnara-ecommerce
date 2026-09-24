"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createBusiness } from "../actions";

type User = { id: string; email: string; full_name: string | null };

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function BusinessForm({ locale, users }: { locale: string; users: User[] }) {
  const router = useRouter();
  const [ownerId, setOwnerId] = useState(users[0]?.id ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    owner: locale === "en" ? "Owner (student)" : "Dueño (estudiante)",
    noUsers: locale === "en" ? "No users signed up yet" : "Todavía no hay usuarios registrados",
    name: locale === "en" ? "Business name" : "Nombre del negocio",
    slug: "Slug",
    description: locale === "en" ? "Description" : "Descripción",
    logoUrl: locale === "en" ? "Logo URL" : "URL del logo",
    bannerUrl: locale === "en" ? "Banner URL" : "URL del banner",
    create: locale === "en" ? "Create business" : "Crear negocio",
    creating: locale === "en" ? "Creating..." : "Creando...",
    success: locale === "en" ? "Business created." : "Negocio creado.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId) {
      toast.error(t.noUsers);
      return;
    }
    setLoading(true);
    try {
      await createBusiness({
        ownerId,
        slug,
        name,
        description,
        logoUrl,
        bannerUrl,
      });
      toast.success(t.success);
      setName("");
      setSlug("");
      setSlugEdited(false);
      setDescription("");
      setLogoUrl("");
      setBannerUrl("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el negocio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-5">
      <FieldGroup>
        <Field>
          <FieldLabel>{t.owner}</FieldLabel>
          <Select value={ownerId} onValueChange={(v) => v && setOwnerId(v)}>
            <SelectTrigger>
              <SelectValue>
                {(value: string) => {
                  const match = users.find((u) => u.id === value);
                  return match ? match.full_name || match.email : t.noUsers;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="business-name">{t.name}</FieldLabel>
          <Input
            id="business-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="business-slug">{t.slug}</FieldLabel>
          <Input
            id="business-slug"
            value={slug}
            onChange={(e) => {
              setSlugEdited(true);
              setSlug(slugify(e.target.value));
            }}
            placeholder="mi-negocio"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="business-description">{t.description}</FieldLabel>
          <textarea
            id="business-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="business-logo">{t.logoUrl}</FieldLabel>
          <Input id="business-logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="business-banner">{t.bannerUrl}</FieldLabel>
          <Input id="business-banner" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
        </Field>
        <Button type="submit" disabled={loading || !ownerId}>
          {loading ? t.creating : t.create}
        </Button>
      </FieldGroup>
    </form>
  );
}
