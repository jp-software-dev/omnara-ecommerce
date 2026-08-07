import { redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "vendor" | "customer";

export async function requireRole(allowedRoles: Role[], locale: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  const role = (profile?.role ?? "customer") as Role;

  if (!allowedRoles.includes(role)) {
    redirect({ href: "/", locale });
  }

  return { user: user!, role };
}
