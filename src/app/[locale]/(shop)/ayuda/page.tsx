import { Link } from "@/i18n/navigation";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const en = locale === "en";

  const faq = [
    {
      q: en ? "How do I track my order?" : "¿Cómo rastreo mi pedido?",
      a: en
        ? "Open My account → My orders and select the order. You'll see its status and, once it ships, a tracking number."
        : "Ve a Mi cuenta → Mis pedidos y selecciona el pedido. Ahí verás su estado y, una vez enviado, el número de rastreo.",
    },
    {
      q: en ? "What payment methods are accepted?" : "¿Qué métodos de pago aceptan?",
      a: en
        ? "Cards via Stripe, in test mode — this is a demo store and never processes a real charge."
        : "Tarjetas vía Stripe, en modo de prueba — esta es una tienda de demostración y nunca procesa un cargo real.",
    },
    {
      q: en ? "How does the size guide work?" : "¿Cómo funciona la guía de tallas?",
      a: en
        ? "Every product page has a size guide with the full canonical range — sizes without stock for that product are shown disabled."
        : "Cada página de producto tiene una guía de tallas con el rango completo — las tallas sin existencia para ese producto se muestran deshabilitadas.",
    },
    {
      q: en ? "Can I change the currency?" : "¿Puedo cambiar la moneda?",
      a: en
        ? "Yes — use the currency switcher in the header to see prices (and pay) in MXN or USD."
        : "Sí — usa el selector de moneda en el encabezado para ver precios (y pagar) en MXN o USD.",
    },
  ];

  const shipping = [
    {
      q: en ? "How much does shipping cost?" : "¿Cuánto cuesta el envío?",
      a: en
        ? "A flat rate applies below the free-shipping threshold shown at checkout; above it, shipping is free."
        : "Aplica una tarifa fija por debajo del umbral de envío gratis que se muestra en el checkout; por encima de ese monto, el envío es gratis.",
    },
    {
      q: en ? "What's the delivery estimate?" : "¿Cuál es el tiempo estimado de entrega?",
      a: en
        ? "Standard shipping across Mexico and the US — exact timing depends on the carrier once your order ships."
        : "Envío estándar dentro de México y Estados Unidos — el tiempo exacto depende de la paquetería una vez que se envía tu pedido.",
    },
    {
      q: en ? "How do returns work?" : "¿Cómo funcionan las devoluciones?",
      a: en
        ? "Contact us within 30 days of delivery and we'll walk you through the return."
        : "Contáctanos dentro de los 30 días posteriores a la entrega y te guiamos en el proceso de devolución.",
    },
  ];

  const t = {
    title: en ? "Help center" : "Centro de ayuda",
    faqTitle: en ? "Frequently asked questions" : "Preguntas frecuentes",
    shippingTitle: en ? "Shipping & returns" : "Envíos y devoluciones",
    stillNeedHelp: en ? "Still need help?" : "¿Sigues con dudas?",
    contactUs: en ? "Contact us" : "Contáctanos",
  };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      <h2 className="mt-8 mb-2 text-lg font-semibold">{t.faqTitle}</h2>
      <Accordion multiple>
        {faq.map((item, index) => (
          <AccordionItem key={index} value={`faq-${index}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <h2 id="envios" className="mt-10 mb-2 text-lg font-semibold scroll-mt-20">
        {t.shippingTitle}
      </h2>
      <Accordion multiple>
        {shipping.map((item, index) => (
          <AccordionItem key={index} value={`shipping-${index}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <p className="mt-10 text-sm text-muted-foreground">
        {t.stillNeedHelp}{" "}
        <Link href="/contacto" className="font-medium underline underline-offset-4">
          {t.contactUs}
        </Link>
      </p>
    </main>
  );
}
