// Maps the Spanish color names stored on product_variants.color to a real
// swatch value. We don't have per-variant photography (only per-product
// images), so a solid color circle — the same pattern Nike itself uses in
// its filter panel — is the honest choice here instead of faking a photo.
const COLOR_SWATCHES: Record<string, string> = {
  blanco: "#f5f5f0",
  negro: "#161616",
  gris: "#8a8a8a",
  azul: "#2451b3",
  rojo: "#c0392b",
  verde: "#2e7d32",
  "verde olivo": "#6b6f3a",
  amarillo: "#f1c40f",
  naranja: "#e67e22",
  rosa: "#e6a4c4",
  morado: "#7d3c98",
  café: "#5b3a29",
  beige: "#d9c7a3",
  dorado: "#b8963e",
  plata: "#b8bcc2",
  ámbar: "#c98a2b",
  natural: "#c9b79c",
  roble: "#a9744f",
  nogal: "#5c3a21",
  transparente: "#e8e8e8",
  madera: "#8a5a34",
};

export function getColorSwatch(colorName: string): string {
  return COLOR_SWATCHES[colorName.trim().toLowerCase()] ?? "#9ca3af";
}
