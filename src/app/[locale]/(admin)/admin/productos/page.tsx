import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminProducts } from "@/lib/supabase/admin-queries";
import { pickLocale, formatPrice } from "@/lib/format";
import { DeleteProductButton } from "./delete-product-button";

export default async function AdminProductsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const products = await getAdminProducts();

  const t = {
    title: locale === "en" ? "Products" : "Productos",
    new: locale === "en" ? "New product" : "Nuevo producto",
    name: locale === "en" ? "Name" : "Nombre",
    price: locale === "en" ? "Price" : "Precio",
    stock: locale === "en" ? "Stock" : "Inventario",
    status: locale === "en" ? "Status" : "Estado",
    actions: locale === "en" ? "Actions" : "Acciones",
    edit: locale === "en" ? "Edit" : "Editar",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <Button
          nativeButton={false}
          render={
            <Link href="/admin/productos/nuevo">
              <Plus className="size-4" />
              {t.new}
            </Link>
          }
        />
      </div>

      <div className="mt-6 rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.name}</TableHead>
              <TableHead>{t.price}</TableHead>
              <TableHead>{t.stock}</TableHead>
              <TableHead>{t.status}</TableHead>
              <TableHead className="text-right">{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const totalStock = product.product_variants.reduce(
                (sum, v) => sum + v.stock_quantity,
                0
              );
              return (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{pickLocale(product.name, locale)}</TableCell>
                  <TableCell>{formatPrice(product.base_price_mxn_cents, "MXN", locale)}</TableCell>
                  <TableCell>{totalStock}</TableCell>
                  <TableCell>
                    <Badge variant={product.status === "active" ? "default" : "outline"}>
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/admin/productos/${product.id}`}>{t.edit}</Link>}
                      />
                      <DeleteProductButton productId={product.id} locale={locale} />
                    </div>
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
