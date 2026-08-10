export type AttributeField = {
  key: string;
  label: { es: string; en: string };
  type: "text" | "select";
  options?: string[];
};

// Attribute values themselves are stored as plain strings in
// products.attributes (jsonb) — only the field labels are bilingual, so
// a vendor filling out the form doesn't have to type every spec twice.
export const CATEGORY_ATTRIBUTES: Record<string, AttributeField[]> = {
  ropa: [
    { key: "material", label: { es: "Material", en: "Material" }, type: "text" },
    {
      key: "genero",
      label: { es: "Género", en: "Gender" },
      type: "select",
      options: ["Hombre", "Mujer", "Unisex"],
    },
    { key: "temporada", label: { es: "Temporada", en: "Season" }, type: "text" },
  ],
  calzado: [
    { key: "material", label: { es: "Material", en: "Material" }, type: "text" },
    {
      key: "genero",
      label: { es: "Género", en: "Gender" },
      type: "select",
      options: ["Hombre", "Mujer", "Unisex"],
    },
    { key: "tipo_suela", label: { es: "Tipo de suela", en: "Sole type" }, type: "text" },
  ],
  electronica: [
    { key: "marca", label: { es: "Marca", en: "Brand" }, type: "text" },
    { key: "modelo", label: { es: "Modelo", en: "Model" }, type: "text" },
    { key: "año", label: { es: "Año", en: "Year" }, type: "text" },
    {
      key: "garantia_meses",
      label: { es: "Garantía (meses)", en: "Warranty (months)" },
      type: "text",
    },
  ],
  accesorios: [
    { key: "marca", label: { es: "Marca", en: "Brand" }, type: "text" },
    { key: "material", label: { es: "Material", en: "Material" }, type: "text" },
  ],
  hogar: [
    { key: "marca", label: { es: "Marca", en: "Brand" }, type: "text" },
    { key: "material", label: { es: "Material", en: "Material" }, type: "text" },
    { key: "dimensiones", label: { es: "Dimensiones", en: "Dimensions" }, type: "text" },
  ],
};

export function getCategoryAttributeFields(categorySlug: string | null | undefined): AttributeField[] {
  if (!categorySlug) return [];
  return CATEGORY_ATTRIBUTES[categorySlug] ?? [];
}
