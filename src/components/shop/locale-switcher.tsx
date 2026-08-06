"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from "@/components/ui/button";
import { Languages } from "lucide-react";

const LOCALE_LABELS: Record<string, string> = { es: "Español", en: "English" };

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
        aria-label="Idioma"
      >
        <Languages className="size-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(LOCALE_LABELS).map(([code, label]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => router.replace(pathname, { locale: code })}
            disabled={code === locale}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
