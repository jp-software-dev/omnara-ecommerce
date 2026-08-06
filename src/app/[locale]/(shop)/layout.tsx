import { Header } from "@/components/shop/header";
import { Footer } from "@/components/shop/footer";

export default async function ShopLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex min-h-svh flex-col">
      <Header locale={locale} />
      <div className="flex flex-1 flex-col">{children}</div>
      <Footer />
    </div>
  );
}
