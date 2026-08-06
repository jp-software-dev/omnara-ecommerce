"use client";

import { useMemo, useState } from "react";
import type { Json } from "@/lib/supabase/types";
import { ProductCard, type ProductCardData } from "@/components/shop/product-card";
import { Checkbox } from "@/components/ui/checkbox";
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
};

type SortOption = "relevance" | "price-asc" | "price-desc";

const SORT_LABELS: Record<string, Record<SortOption, string>> = {
  es: {
    relevance: "Relevancia",
    "price-asc": "Precio: menor a mayor",
    "price-desc": "Precio: mayor a menor",
  },
  en: {
    relevance: "Relevance",
    "price-asc": "Price: low to high",
    "price-desc": "Price: high to low",
  },
};

export function CategoryFilters({
  products,
  locale,
}: {
  products: Product[];
  locale: string;
}) {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [sort, setSort] = useState<SortOption>("relevance");

  const { colors, sizes } = useMemo(() => {
    const colorSet = new Set<string>();
    const sizeSet = new Set<string>();
    for (const product of products) {
      for (const variant of product.product_variants) {
        if (variant.color) colorSet.add(variant.color);
        if (variant.size) sizeSet.add(variant.size);
      }
    }
    return { colors: [...colorSet].sort(), sizes: [...sizeSet].sort() };
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const matchesColor =
        selectedColors.length === 0 ||
        product.product_variants.some((v) => v.color && selectedColors.includes(v.color));
      const matchesSize =
        selectedSizes.length === 0 ||
        product.product_variants.some((v) => v.size && selectedSizes.includes(v.size));
      return matchesColor && matchesSize;
    });

    if (sort === "price-asc") {
      result = [...result].sort((a, b) => a.base_price_mxn_cents - b.base_price_mxn_cents);
    } else if (sort === "price-desc") {
      result = [...result].sort((a, b) => b.base_price_mxn_cents - a.base_price_mxn_cents);
    }

    return result;
  }, [products, selectedColors, selectedSizes, sort]);

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

        {colors.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">
              {locale === "en" ? "Color" : "Color"}
            </p>
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
          </div>
        ) : null}

        {sizes.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium">
              {locale === "en" ? "Size" : "Talla"}
            </p>
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
          </div>
        ) : null}
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
