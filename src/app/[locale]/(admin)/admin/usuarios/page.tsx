import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminUsers } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { RoleSelect } from "./role-select";

const ROLE_LABELS: Record<string, { es: string; en: string }> = {
  admin: { es: "Admin", en: "Admin" },
  vendor: { es: "Vendedor", en: "Vendor" },
  customer: { es: "Cliente", en: "Customer" },
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireRole(["admin"], locale);

  const users = await getAdminUsers();

  const labels = Object.fromEntries(
    Object.entries(ROLE_LABELS).map(([key, value]) => [key, value[locale === "en" ? "en" : "es"]])
  );

  const t = {
    title: locale === "en" ? "Users" : "Usuarios",
    name: locale === "en" ? "Name" : "Nombre",
    email: locale === "en" ? "Email" : "Correo",
    role: locale === "en" ? "Role" : "Rol",
    joined: locale === "en" ? "Joined" : "Se unió",
    you: locale === "en" ? "(you)" : "(tú)",
    empty: locale === "en" ? "No users yet." : "Todavía no hay usuarios.",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      {users.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="mt-6 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.email}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.joined}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell className="font-medium">
                    {profile.full_name || "—"}
                    {profile.id === user.id ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">{t.you}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{profile.email}</TableCell>
                  <TableCell>
                    <RoleSelect
                      userId={profile.id}
                      initialRole={profile.role}
                      labels={labels}
                      disabled={profile.id === user.id}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(profile.created_at).toLocaleDateString(locale === "en" ? "en-US" : "es-MX")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
