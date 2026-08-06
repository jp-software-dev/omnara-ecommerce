"use client";

import { useRouter } from "@/i18n/navigation";
import { User, LogOut, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountMenu({
  email,
  locale,
}: {
  email: string | null;
  locale: string;
}) {
  const router = useRouter();

  if (!email) {
    return (
      <Button
        variant="ghost"
        size="icon"
        nativeButton={false}
        aria-label={locale === "en" ? "Account" : "Cuenta"}
        render={
          <Link href="/login">
            <User className="size-5" />
          </Link>
        }
      />
    );
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label={locale === "en" ? "Account" : "Cuenta"}
      >
        <UserRound className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-48 truncate font-normal text-muted-foreground">
          {email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <Link href="/cuenta">{locale === "en" ? "My account" : "Mi cuenta"}</Link>
          }
        />
        <DropdownMenuItem onClick={handleSignOut} variant="destructive">
          <LogOut />
          {locale === "en" ? "Sign out" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
