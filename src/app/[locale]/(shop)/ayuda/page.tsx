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
      q: en ? "Is this a real store?" : "¿Esta es una tienda real?",
      a: en
        ? "No. Omnara is an educational demo project: no product is real or actually sold, and nothing is charged or shipped. Everything you see (products, businesses, orders, tracking numbers, returns and refunds) is sample data that shows how an online marketplace works."
        : "No. Omnara es un proyecto educativo de demostración: ningún producto es real ni se vende realmente, y no se cobra ni se envía nada. Todo lo que ves (productos, negocios, pedidos, números de rastreo, devoluciones y reembolsos) son datos de ejemplo que muestran cómo funciona un marketplace.",
    },
    {
      q: en ? "How do I track my order?" : "¿Cómo rastreo mi pedido?",
      a: en
        ? "Open My account → My orders and select the order (if you bought without an account, use the link of your confirmation or the email we sent you). You'll see every step of each shipment with its date, the estimated delivery and a sample tracking number. We also email you at each step."
        : "Ve a Mi cuenta → Mis pedidos y selecciona el pedido (si compraste sin cuenta, usa el enlace de tu confirmación o el correo que te enviamos). Verás cada paso de cada envío con su fecha, la entrega estimada y un número de rastreo de ejemplo. También te avisamos por correo en cada paso.",
    },
    {
      q: en ? "What payment methods are accepted?" : "¿Qué métodos de pago aceptan?",
      a: en
        ? "None: the payment is simulated. This is a demo store, so paying just creates a sample order and never charges anything. You don't need a card."
        : "Ninguno: el pago es simulado. Esta es una tienda de demostración, así que pagar solo crea un pedido de ejemplo y nunca cobra nada. No necesitas tarjeta.",
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
        ? "Each seller ships its own package and each package pays a flat rate, unless that seller's part of the cart reaches the free-shipping threshold shown at checkout. It is an example: nothing is really shipped. We only deliver inside Mexico."
        : "Cada vendedor envía su propio paquete y cada paquete paga una tarifa fija, salvo que la parte del carrito de ese vendedor alcance el umbral de envío gratis que se muestra en el checkout. Es un ejemplo: en realidad no se envía nada. Solo entregamos dentro de México.",
    },
    {
      q: en ? "What's the delivery estimate?" : "¿Cuál es el tiempo estimado de entrega?",
      a: en
        ? "There is no real delivery, but the dates follow real time: your order is prepared, ships within 24 hours of your payment and then moves through transit, arrival in your state and delivery during carrier hours (Monday to Saturday, no public holidays). Each seller ships their own items, so one order can have several shipments. When it is delivered, confirm it from your order to close it."
        : "No hay entrega real, pero las fechas siguen el tiempo real: tu pedido se prepara, sale a más tardar 24 horas después de tu pago y luego pasa por tránsito, llegada a tu estado y reparto en horario de paquetería (de lunes a sábado, sin días festivos). Cada vendedor envía sus propios artículos, así que un pedido puede tener varios envíos. Cuando se entregue, confírmalo desde tu pedido para cerrarlo.",
    },
    {
      q: en ? "Can I cancel my order?" : "¿Puedo cancelar mi pedido?",
      a: en
        ? "Yes, while the shipment has not left (it is still confirmed or being prepared): open the order and press Cancel this shipment. The items go back to stock and the refund is simulated; the shipping fee is refunded only if the whole order is cancelled."
        : "Sí, mientras el envío no haya salido (siga confirmado o en preparación): abre el pedido y pulsa Cancelar este envío. Los artículos regresan al inventario y el reembolso es simulado; el envío solo se reembolsa si se cancela todo el pedido.",
    },
    {
      q: en ? "How do returns work?" : "¿Cómo funcionan las devoluciones?",
      a: en
        ? "Open the order and request a return for any delivered item, within 30 days of its delivery, and attach photos if you want. The seller approves or rejects it, you can open a dispute if it is rejected, and an admin records the refund (simulated: no real money is involved)."
        : "Abre el pedido y solicita la devolución de cualquier artículo entregado, dentro de los 30 días posteriores a su entrega, y adjunta fotos si quieres. El vendedor la aprueba o rechaza, puedes abrir una disputa si la rechaza y un administrador registra el reembolso (simulado: no interviene dinero real).",
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
