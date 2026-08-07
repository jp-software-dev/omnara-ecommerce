import { SiteChrome } from "@/components/shop/site-chrome";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <SiteChrome locale={locale}>{children}</SiteChrome>;
}
