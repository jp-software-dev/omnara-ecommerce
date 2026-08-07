import { getTranslations } from "next-intl/server";
import { ShoppingBag, Heart, Menu, Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCategories } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { pickLocale } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/shop/locale-switcher";
import { CartButton } from "@/components/shop/cart-button";
import { AccountMenu } from "@/components/shop/account-menu";
import { SearchBar } from "@/components/shop/search-bar";
import { CurrencySwitcher } from "@/components/shop/currency-switcher";

export async function Header({ locale }: { locale: string }) {
  const t = await getTranslations("common");
  const categories = await getCategories();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Sheet>
          <SheetTrigger
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
            aria-label="Menú"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>{t("brand")}</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/categoria/${category.slug}`}
                  className="rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  {pickLocale(category.name, locale)}
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <Link href="/" className="flex items-center gap-2 font-semibold">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <ShoppingBag className="size-4" />
          </div>
          {t("brand")}
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/categoria/${category.slug}`}
              className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {pickLocale(category.name, locale)}
            </Link>
          ))}
        </nav>

        <SearchBar locale={locale} />

        <div className="ml-auto flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            aria-label={locale === "en" ? "Search" : "Buscar"}
            className="md:hidden"
            render={
              <Link href="/buscar">
                <Search className="size-5" />
              </Link>
            }
          />
          <CurrencySwitcher />
          <LocaleSwitcher />
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            aria-label={t("wishlist")}
            render={
              <Link href="/cuenta">
                <Heart className="size-5" />
              </Link>
            }
          />
          <AccountMenu email={user?.email ?? null} locale={locale} />
          <CartButton label={t("cart")} />
        </div>
      </div>
    </header>
  );
}
