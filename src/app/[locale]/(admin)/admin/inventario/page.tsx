import { AlertTriangle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getAllVariantsForInventory } from "@/lib/supabase/admin-queries";
import { pickLocale } from "@/lib/format";
import { StockInput } from "./stock-input";

export default async function AdminInventoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const variants = await getAllVariantsForInventory();
  const lowStockCount = variants.filter((v) => v.stock_quantity <= v.low_stock_threshold).length;

  const t = {
    title: locale === "en" ? "Inventory" : "Inventario",
    lowStock: locale === "en" ? "low stock" : "con stock bajo",
    product: locale === "en" ? "Product" : "Producto",
    variant: locale === "en" ? "Variant" : "Variante",
    threshold: locale === "en" ? "Threshold" : "Umbral",
    stock: locale === "en" ? "Stock" : "Existencias",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        {lowStockCount > 0 ? (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="size-3" />
            {lowStockCount} {t.lowStock}
          </Badge>
        ) : null}
      </div>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.product}</TableHead>
              <TableHead>{t.variant}</TableHead>
              <TableHead>{t.threshold}</TableHead>
              <TableHead>{t.stock}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant) => {
              const isLow = variant.stock_quantity <= variant.low_stock_threshold;
              return (
                <TableRow key={variant.id} className={isLow ? "bg-destructive/5" : undefined}>
                  <TableCell className="font-medium">
                    {variant.products ? pickLocale(variant.products.name, locale) : variant.sku}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {[variant.size, variant.color].filter(Boolean).join(" · ") || variant.sku}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{variant.low_stock_threshold}</TableCell>
                  <TableCell>
                    <StockInput variantId={variant.id} initialValue={variant.stock_quantity} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
