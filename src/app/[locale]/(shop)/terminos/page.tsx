import { Link } from "@/i18n/navigation";
import { LegalDocument, type LegalSection } from "@/components/shop/legal-document";

const ES: LegalSection[] = [
  {
    heading: "Proyecto educativo, no una tienda real",
    paragraphs: [
      "Omnara es un marketplace de demostración desarrollado como proyecto académico del IUEM, con fines exclusivamente educativos.",
      "Ningún producto es real ni se vende realmente. Los productos, precios, negocios, reseñas y preguntas son datos de ejemplo creados para el curso.",
      "No se realiza ningún cobro real, no se entrega ningún producto y no se hace ningún envío. Los pedidos, números de rastreo, devoluciones y reembolsos son simulaciones que muestran cómo funcionaría una tienda en línea.",
    ],
  },
  {
    heading: "Pagos de prueba",
    items: [
      "Los pagos se procesan con Stripe en modo de prueba: ningún dinero se mueve.",
      "Para probar el pago usa únicamente la tarjeta de prueba que se muestra en el checkout. No ingreses una tarjeta real.",
    ],
  },
  {
    heading: "Los negocios de la plataforma",
    paragraphs: [
      "Los negocios que aparecen en Omnara son ejercicios de estudiantes. Que un negocio esté aprobado o aparezca como \"Vendido por\" no crea una relación comercial real ni obligaciones de venta, entrega o garantía.",
    ],
  },
  {
    heading: "Tu cuenta y tus datos",
    items: [
      "Puedes navegar y hacer compras de prueba sin cuenta. Necesitas una para ver tus pedidos, escribir reseñas, hacer preguntas, guardar direcciones y pedir devoluciones de prueba.",
      "Te recomendamos usar datos de ejemplo y no información personal que no quieras compartir. Eres responsable de tu contraseña.",
      "No uses la plataforma para actividades ilegales ni para perjudicar a otras personas.",
    ],
  },
  {
    heading: "Pedidos, envíos y devoluciones (simulados)",
    items: [
      "El costo de envío (fijo, o gratis a partir del monto que se muestra al pagar) es un ejemplo: nada se envía en realidad. Los vendedores de prueba pueden marcar artículos como enviados y escribir un número de rastreo de ejemplo.",
      "Puedes simular la devolución de un artículo hasta 30 días después de su \"envío\", desde el detalle de tu pedido. El vendedor la revisa; si la rechaza, puedes abrir una disputa y Omnara decide.",
      "Un reembolso aprobado se registra a través de Stripe en modo de prueba y equivale al precio del artículo menos su parte proporcional de cualquier descuento; el envío no se reembolsa. No se devuelve dinero real porque nunca se cobró.",
    ],
  },
  {
    heading: "Reseñas y preguntas",
    items: [
      "Solo quienes \"compraron\" un producto en la plataforma pueden reseñarlo; esas reseñas llevan la marca de compra verificada. Las preguntas a los vendedores son públicas.",
      "Sé respetuoso y no publiques datos personales de personas reales. Omnara puede ocultar reseñas o preguntas ofensivas, falsas o ajenas al producto.",
    ],
  },
  {
    heading: "Si participas como vendedor (estudiante)",
    items: [
      "Para el ejercicio, la solicitud pide los datos de tu negocio y un documento de identificación (te sugerimos tu credencial de estudiante). Solo lo ven los administradores.",
      "Te comprometes a publicar información de ejemplo coherente, mantener tu inventario al día, marcar los envíos y responder a compradores y devoluciones como parte de la práctica.",
      "Omnara puede pausar un negocio, lo que oculta sus productos, si incumple estos términos.",
    ],
  },
  {
    heading: "Disponibilidad y datos",
    paragraphs: [
      "El proyecto puede cambiar, reiniciarse o cerrarse en cualquier momento. Los datos, incluidas cuentas, pedidos de prueba y reseñas, pueden borrarse sin aviso, por ejemplo al reiniciar la base de demostración o al terminar el curso.",
    ],
  },
  {
    heading: "Limitación de responsabilidad",
    paragraphs: [
      "Omnara se ofrece tal como está, sin garantías y solo con fines educativos. Como no hay compras reales, no existen obligaciones reales de entrega, garantía, devolución o reembolso. El equipo no responde por el uso que hagas de la plataforma ni por los datos que decidas ingresar.",
    ],
  },
  {
    heading: "Cambios y contacto",
    paragraphs: [
      "Podemos actualizar estos términos y publicaremos la versión nueva en esta página con su fecha. Para cualquier duda, usa la página de Contacto.",
    ],
  },
];

const EN: LegalSection[] = [
  {
    heading: "An educational project, not a real store",
    paragraphs: [
      "Omnara is a demonstration marketplace built as an academic project at IUEM, for educational purposes only.",
      "No product is real and nothing is actually sold. The products, prices, businesses, reviews and questions are sample data created for the course.",
      "No real charge is made, no product is delivered and nothing is shipped. Orders, tracking numbers, returns and refunds are simulations that show how an online store would work.",
    ],
  },
  {
    heading: "Test payments",
    items: [
      "Payments are processed with Stripe in test mode: no money moves.",
      "To try the payment, use only the test card shown at checkout. Do not enter a real card.",
    ],
  },
  {
    heading: "The businesses on the platform",
    paragraphs: [
      "The businesses shown in Omnara are student exercises. A business being approved or appearing as \"Sold by\" does not create a real commercial relationship or any obligation to sell, deliver or give a warranty.",
    ],
  },
  {
    heading: "Your account and your data",
    items: [
      "You can browse and make test purchases without an account. You need one to see your orders, write reviews, ask questions, save addresses and request test returns.",
      "We recommend using sample data and not personal information you don't want to share. You are responsible for your password.",
      "Do not use the platform for illegal activity or to harm others.",
    ],
  },
  {
    heading: "Orders, shipping and returns (simulated)",
    items: [
      "The shipping cost (flat, or free above the amount shown at checkout) is an example: nothing is really shipped. Test sellers can mark items as shipped and enter a sample tracking number.",
      "You can simulate returning an item up to 30 days after it was \"shipped\", from your order page. The seller reviews it; if they reject it, you can open a dispute and Omnara decides.",
      "An approved refund is recorded through Stripe in test mode and equals the item's price minus its proportional share of any discount; shipping is not refunded. No real money is returned because none was ever charged.",
    ],
  },
  {
    heading: "Reviews and questions",
    items: [
      "Only people who \"bought\" a product on the platform can review it; those reviews carry the Verified purchase badge. Questions to sellers are public.",
      "Be respectful and don't post personal data about real people. Omnara may hide reviews or questions that are offensive, false or unrelated to the product.",
    ],
  },
  {
    heading: "If you take part as a seller (student)",
    items: [
      "For the exercise, the application asks for your business details and an identity document (we suggest your student ID). Only administrators can see it.",
      "You agree to publish consistent sample information, keep your inventory up to date, mark shipments and respond to buyers and returns as part of the practice.",
      "Omnara may pause a business, which hides its products, if it breaches these terms.",
    ],
  },
  {
    heading: "Availability and data",
    paragraphs: [
      "The project may change, be reset or be closed at any time. Data, including accounts, test orders and reviews, may be deleted without notice, for example when the demo database is reset or the course ends.",
    ],
  },
  {
    heading: "Limitation of liability",
    paragraphs: [
      "Omnara is provided as is, without warranties and for educational purposes only. Because there are no real purchases, there are no real obligations of delivery, warranty, return or refund. The team is not responsible for how you use the platform or for the data you choose to enter.",
    ],
  },
  {
    heading: "Changes and contact",
    paragraphs: [
      "We may update these terms and will publish the new version on this page with its date. For any question, use the Contact page.",
    ],
  },
];

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";

  return (
    <LegalDocument
      title={en ? "Terms of service" : "Términos de servicio"}
      updated={en ? "Last updated: November 12, 2026" : "Última actualización: 12 de noviembre de 2026"}
      notice={
        en
          ? "Educational test project: no product is real or actually sold, and no real charge or shipment is ever made."
          : "Proyecto educativo de prueba: ningún producto es real ni se vende realmente, y nunca se hace un cobro ni un envío real."
      }
      intro={
        en
          ? "By using Omnara you agree to these terms. Please read them together with the privacy notice."
          : "Al usar Omnara aceptas estos términos. Léelos junto con el aviso de privacidad."
      }
      sections={en ? EN : ES}
      footer={
        <p>
          <Link href="/privacidad" className="font-medium underline underline-offset-4">
            {en ? "Privacy notice" : "Aviso de privacidad"}
          </Link>
          {" · "}
          <Link href="/contacto" className="font-medium underline underline-offset-4">
            {en ? "Contact us" : "Contáctanos"}
          </Link>
        </p>
      }
    />
  );
}
