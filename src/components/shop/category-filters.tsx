"use client";

import { useMemo, useState } from "react";
import type { Json } from "@/lib/supabase/types";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Variant = { size: string | null; color: string | null; stock_quantity: number };

type Product = ProductCardData & {
  id: string;
  description_short: Json;
  product_variants: Variant[];
  attributes: Json;
  created_at: string;
};

type SortOption = "newest" | "relevance" | "price-asc" | "price-desc";

const SORT_LABELS: Record<string, Record<SortOption, string>> = {
  es: {
    newest: "Lo más nuevo",
    relevance: "Relevancia",
    "price-asc": "Precio: menor a mayor",
    "price-desc": "Precio: mayor a menor",
  },
  en: {
    newest: "Newest",
    relevance: "Relevance",
    "price-asc": "Price: low to high",
    "price-desc": "Price: high to low",
  },
};

const GENDER_OPTIONS = ["Hombre", "Mujer", "Unisex"] as const;

export function CategoryFilters({
  products,
  locale,
}: {
  products: Product[];
  locale: string;
}) {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedGenders, setSelectedGenders] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("relevance");

  const genderOf = (product: Product) =>
    (product.attributes as Record<string, string> | null)?.genero ?? null;

  const { colors, sizes, hasGenderData } = useMemo(() => {
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    let genderFound = false;
    for (const product of products) {
      for (const variant of product.product_variants) {
        if (variant.color) colorSet.add(variant.color);
        if (variant.size) sizeSet.add(variant.size);
      }
      if (genderOf(product)) genderFound = true;
    }
    return { colors: [...colorSet].sort(), sizes: [...sizeSet].sort(), hasGenderData: genderFound };
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const matchesColor =
        selectedColors.length === 0 ||
        product.product_variants.some((v) => v.color && selectedColors.includes(v.color));
      const matchesSize =
        selectedSizes.length === 0 ||
        product.product_variants.some((v) => v.size && selectedSizes.includes(v.size));
      const matchesGender =
        selectedGenders.length === 0 || selectedGenders.includes(genderOf(product) ?? "");
      return matchesColor && matchesSize && matchesGender;
    });

    if (sort === "newest") {
      result = [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));
    } else if (sort === "price-asc") {
      result = [...result].sort((a, b) => a.base_price_mxn_cents - b.base_price_mxn_cents);
    } else if (sort === "price-desc") {
      result = [...result].sort((a, b) => b.base_price_mxn_cents - a.base_price_mxn_cents);
    }

    return result;
  }, [products, selectedColors, selectedSizes, selectedGenders, sort]);

  function toggle(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[220px_1fr]">
      <aside className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} {locale === "en" ? "results" : "resultados"}
          </p>
        </div>

        <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
          <SelectTrigger className="w-full">
            <SelectValue>{(value: SortOption) => SORT_LABELS[locale][value]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              {locale === "en" ? "Newest" : "Lo más nuevo"}
            </SelectItem>
            <SelectItem value="relevance">
              {locale === "en" ? "Relevance" : "Relevancia"}
            </SelectItem>
            <SelectItem value="price-asc">
              {locale === "en" ? "Price: low to high" : "Precio: menor a mayor"}
            </SelectItem>
            <SelectItem value="price-desc">
              {locale === "en" ? "Price: high to low" : "Precio: mayor a menor"}
            </SelectItem>
          </SelectContent>
        </Select>

        <Accordion
          multiple
          defaultValue={[
            ...(colors.length > 0 ? ["color"] : []),
            ...(sizes.length > 0 ? ["size"] : []),
            ...(hasGenderData ? ["gender"] : []),
          ]}
        >
          {hasGenderData ? (
            <AccordionItem value="gender">
              <AccordionTrigger>{locale === "en" ? "Gender" : "Género"}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {GENDER_OPTIONS.map((gender) => (
                    <label key={gender} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedGenders.includes(gender)}
                        onCheckedChange={() => toggle(selectedGenders, gender, setSelectedGenders)}
                      />
                      {gender}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {colors.length > 0 ? (
            <AccordionItem value="color">
              <AccordionTrigger>{locale === "en" ? "Color" : "Color"}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {colors.map((color) => (
                    <label key={color} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedColors.includes(color)}
                        onCheckedChange={() => toggle(selectedColors, color, setSelectedColors)}
                      />
                      {color}
                    </label>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {sizes.length > 0 ? (
            <AccordionItem value="size">
              <AccordionTrigger>{locale === "en" ? "Size" : "Talla"}</AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const active = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggle(selectedSizes, size, setSelectedSizes)}
                        className={`rounded-md border px-3 py-1 text-sm ${
                          active ? "border-foreground bg-foreground text-background" : ""
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      </aside>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} locale={locale} />
        ))}
        {filtered.length === 0 ? (
          <p className="col-span-full text-sm text-muted-foreground">
            {locale === "en"
              ? "No products match these filters."
              : "No hay productos con estos filtros."}
          </p>
        ) : null}
      </div>
    </div>
  );
}
