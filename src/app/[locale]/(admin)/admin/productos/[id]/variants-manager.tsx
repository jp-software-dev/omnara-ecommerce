"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { addVariant, deleteVariant } from "../../actions";

type Variant = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  price_override_mxn_cents: number | null;
};

export function VariantsManager({
  locale,
  productId,
  variants,
}: {
  locale: string;
  productId: string;
  variants: Variant[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("0");

  const en = locale === "en";
  const t = {
    title: en ? "Variants" : "Variantes",
    hint: en
      ? "A product can only be bought once it has at least one variant with stock."
      : "Un producto solo se puede comprar cuando tiene al menos una variante con inventario.",
    sku: "SKU",
    size: en ? "Size" : "Talla",
    color: "Color",
    price: en ? "Price override (MXN, optional)" : "Precio propio (MXN, opcional)",
    stock: en ? "Stock" : "Inventario",
    add: en ? "Add variant" : "Agregar variante",
    remove: en ? "Delete" : "Eliminar",
    empty: en ? "No variants yet." : "Todavía no hay variantes.",
  };

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    const priceNumber = price.trim() === "" ? null : Math.round(parseFloat(price) * 100);
    if (priceNumber !== null && (!Number.isFinite(priceNumber) || priceNumber <= 0)) {
      toast.error(en ? "Enter a valid price." : "Ingresa un precio válido.");
      return;
    }
    startTransition(async () => {
      try {
        await addVariant(productId, {
          sku,
          size,
          color,
          priceOverrideMxnCents: priceNumber,
          stockQuantity: Math.max(0, Math.round(Number(stock) || 0)),
        });
        setSku("");
        setSize("");
        setColor("");
        setPrice("");
        setStock("0");
        toast.success(en ? "Variant added." : "Variante agregada.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  function handleDelete(variantId: string) {
    startTransition(async () => {
      try {
        await deleteVariant(variantId);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <section className="mt-10 max-w-xl">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.hint}</p>

      {variants.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-3 divide-y rounded-lg border">
          {variants.map((variant) => (
            <li key={variant.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
              <span>{[variant.sku, variant.size, variant.color].filter(Boolean).join(" · ")}</span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {t.stock}: {variant.stock_quantity}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  disabled={pending}
                  onClick={() => handleDelete(variant.id)}
                >
                  {t.remove}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mt-4 grid grid-cols-2 gap-3 rounded-lg border p-4">
        <Field>
          <FieldLabel htmlFor="v-sku">{t.sku}</FieldLabel>
          <Input id="v-sku" value={sku} onChange={(e) => setSku(e.target.value)} required />
        </Field>
        <Field>
          <FieldLabel htmlFor="v-stock">{t.stock}</FieldLabel>
          <Input
            id="v-stock"
            type="number"
            min="0"
            step="1"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="v-size">{t.size}</FieldLabel>
          <Input id="v-size" value={size} onChange={(e) => setSize(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="v-color">{t.color}</FieldLabel>
          <Input id="v-color" value={color} onChange={(e) => setColor(e.target.value)} />
        </Field>
        <Field className="col-span-2">
          <FieldLabel htmlFor="v-price">{t.price}</FieldLabel>
          <Input
            id="v-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={pending} className="col-span-2">
          {t.add}
        </Button>
      </form>
    </section>
  );
}
