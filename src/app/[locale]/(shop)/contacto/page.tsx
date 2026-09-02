import { ContactForm } from "@/components/shop/contact-form";

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const t = {
    title: locale === "en" ? "Contact us" : "Contáctanos",
    subtitle:
      locale === "en"
        ? "Questions about an order, a product, or anything else — send us a message."
        : "Dudas sobre un pedido, un producto o cualquier otra cosa — envíanos un mensaje.",
  };

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
      <p className="mt-1 text-muted-foreground">{t.subtitle}</p>
      <ContactForm locale={locale} />
    </main>
  );
}
