import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";

export function SiteChrome({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: string;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        {locale === "en" ? "Skip to content" : "Saltar al contenido"}
      </a>
      <Header locale={locale} />
      <div id="main-content" className="flex flex-1 flex-col">
        {children}
      </div>
      <Footer />
    </div>
  );
}
