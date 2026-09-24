import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getBusinesses, getAdminUsers } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { BusinessForm } from "./business-form";

export default async function AdminBusinessesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(["admin"], locale);

  const [businesses, allUsers] = await Promise.all([getBusinesses(), getAdminUsers()]);
  // Admins can't be picked as a business owner — createBusiness would
  // otherwise silently demote them to vendor.
  const users = allUsers.filter((u) => u.role !== "admin");

  const t = {
    title: locale === "en" ? "Businesses" : "Negocios",
    name: locale === "en" ? "Business" : "Negocio",
    owner: locale === "en" ? "Owner" : "Dueño",
    slug: "Slug",
    status: locale === "en" ? "Status" : "Estado",
    active: locale === "en" ? "Active" : "Activo",
    inactive: locale === "en" ? "Inactive" : "Inactivo",
    empty: locale === "en" ? "No businesses yet." : "Todavía no hay negocios.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {businesses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>{t.slug}</TableHead>
                  <TableHead>{t.owner}</TableHead>
                  <TableHead>{t.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">
                      <Link href={`/admin/negocios/${business.id}`} className="hover:underline">
                        {business.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">{business.slug}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {business.profiles?.full_name || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={business.is_active ? "default" : "secondary"}>
                        {business.is_active ? t.active : t.inactive}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <BusinessForm locale={locale} users={users} />
      </div>
    </main>
  );
}
