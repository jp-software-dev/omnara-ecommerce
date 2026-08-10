"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
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
import { pickLocale } from "@/lib/format";
import { getCategoryAttributeFields } from "@/lib/category-attributes";
import type { Json } from "@/lib/supabase/types";
import { createProduct, updateProduct } from "../actions";

type Category = { id: string; slug: string; name: Json };

const STATUS_VALUES = ["active", "draft", "archived"] as const;

export function ProductForm({
  locale,
  categories,
  productId,
  initial,
}: {
  locale: string;
  categories: Category[];
  productId?: string;
  initial?: {
    nameEs: string;
    nameEn: string;
    basePriceMxnCents: number;
    categoryId: string | null;
    status: string;
    attributes: Record<string, string>;
  };
}) {
  const router = useRouter();
  const [nameEs, setNameEs] = useState(initial?.nameEs ?? "");
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? "");
  const [slug, setSlug] = useState("");
  const [price, setPrice] = useState(
    initial ? String(initial.basePriceMxnCents / 100) : ""
  );
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? categories[0]?.id ?? ""
  );
  const [status, setStatus] = useState(initial?.status ?? "active");
  const [attributes, setAttributes] = useState<Record<string, string>>(
    initial?.attributes ?? {}
  );
  const [loading, setLoading] = useState(false);

  const statusLabels: Record<(typeof STATUS_VALUES)[number], string> = {
    active: locale === "en" ? "Active" : "Activo",
    draft: locale === "en" ? "Draft" : "Borrador",
    archived: locale === "en" ? "Archived" : "Archivado",
  };

  const t = {
    nameEs: locale === "en" ? "Name (Spanish)" : "Nombre (Español)",
    nameEn: locale === "en" ? "Name (English)" : "Nombre (Inglés)",
    slug: "Slug",
    price: locale === "en" ? "Price (MXN)" : "Precio (MXN)",
    category: locale === "en" ? "Category" : "Categoría",
    status: locale === "en" ? "Status" : "Estado",
    save: locale === "en" ? "Save" : "Guardar",
    saving: locale === "en" ? "Saving..." : "Guardando...",
  };

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const attributeFields = getCategoryAttributeFields(selectedCategory?.slug);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const basePriceMxnCents = Math.round(parseFloat(price) * 100);
      if (!Number.isFinite(basePriceMxnCents) || basePriceMxnCents <= 0) {
        throw new Error(locale === "en" ? "Enter a valid price." : "Ingresa un precio válido.");
      }

      // Only keep values for fields that still apply to the current category
      // (e.g. switching from "ropa" to "electronica" shouldn't leave a
      // stray "material" value behind under a key that page no longer shows).
      const relevantAttributes = Object.fromEntries(
        attributeFields
          .map((field) => [field.key, attributes[field.key]?.trim() ?? ""])
          .filter(([, value]) => value !== "")
      );

      if (productId) {
        await updateProduct(productId, {
          nameEs,
          nameEn,
          basePriceMxnCents,
          categoryId: categoryId || null,
          status,
          attributes: relevantAttributes,
        });
      } else {
        if (!slug.trim()) {
          throw new Error(locale === "en" ? "Slug is required." : "El slug es obligatorio.");
        }
        await createProduct({
          slug: slug.trim(),
          nameEs,
          nameEn,
          basePriceMxnCents,
          categoryId: categoryId || null,
          status,
          attributes: relevantAttributes,
        });
      }
      toast.success(locale === "en" ? "Saved." : "Guardado.");
      router.push("/admin/productos");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nameEs">{t.nameEs}</FieldLabel>
          <Input
            id="nameEs"
            value={nameEs}
            onChange={(event) => setNameEs(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="nameEn">{t.nameEn}</FieldLabel>
          <Input
            id="nameEn"
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
            required
          />
        </Field>
        {!productId ? (
          <Field>
            <FieldLabel htmlFor="slug">{t.slug}</FieldLabel>
            <Input
              id="slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="mi-producto-nuevo"
              required
            />
          </Field>
        ) : null}
        <Field>
          <FieldLabel htmlFor="price">{t.price}</FieldLabel>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel>{t.category}</FieldLabel>
          <Select value={categoryId} onValueChange={(value) => setCategoryId(value as string)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {() => (selectedCategory ? pickLocale(selectedCategory.name, locale) : "")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {pickLocale(category.name, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {attributeFields.map((field) => (
          <Field key={field.key}>
            <FieldLabel htmlFor={`attr-${field.key}`}>
              {field.label[locale === "en" ? "en" : "es"]}
            </FieldLabel>
            {field.type === "select" && field.options ? (
              <Select
                value={attributes[field.key] ?? ""}
                onValueChange={(value) =>
                  setAttributes((prev) => ({ ...prev, [field.key]: (value as string) ?? "" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue>{(value: string) => value}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`attr-${field.key}`}
                value={attributes[field.key] ?? ""}
                onChange={(event) =>
                  setAttributes((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
              />
            )}
          </Field>
        ))}
        <Field>
          <FieldLabel>{t.status}</FieldLabel>
          <Select value={status} onValueChange={(value) => setStatus(value as string)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: (typeof STATUS_VALUES)[number]) => statusLabels[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {statusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? t.saving : t.save}
        </Button>
      </FieldGroup>
    </form>
  );
}
