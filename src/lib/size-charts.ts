// Canonical size ranges shown as selectable options (and in the size
// guide) regardless of which sizes a given product actually has variants
// for — sizes without a matching variant render disabled/struck-through
// instead of being omitted, matching how real footwear/apparel retailers
// (Nike included) show the full range a product line comes in.
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export const FOOTWEAR_SIZE_CHART = [
  { cm: "22", mx: "23", us: "4.5" },
  { cm: "22.5", mx: "23.5", us: "5" },
  { cm: "23", mx: "24", us: "5.5" },
  { cm: "23.5", mx: "24.5", us: "6" },
  { cm: "24", mx: "25", us: "6.5" },
  { cm: "24.5", mx: "25.5", us: "7" },
  { cm: "25", mx: "26", us: "7.5" },
  { cm: "25.5", mx: "26.5", us: "8" },
  { cm: "26", mx: "27", us: "8.5" },
  { cm: "26.5", mx: "27.5", us: "9" },
  { cm: "27", mx: "28", us: "9.5" },
  { cm: "27.5", mx: "28.5", us: "10" },
  { cm: "28", mx: "29", us: "10.5" },
  { cm: "28.5", mx: "29.5", us: "11" },
  { cm: "29", mx: "30", us: "11.5" },
] as const;

export const FOOTWEAR_SIZES = FOOTWEAR_SIZE_CHART.map((row) => row.cm);
