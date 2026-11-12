import { Link } from "@/i18n/navigation";
import { LegalDocument, type LegalSection } from "@/components/shop/legal-document";

const ES: LegalSection[] = [
  {
    heading: "Qué es Omnara",
    paragraphs: [
      "Omnara es un marketplace: una plataforma donde negocios independientes (estudiantes) venden sus productos bajo un mismo catálogo, carrito y pago. Es un proyecto académico del IUEM y funciona en modo de prueba: los pagos se hacen con Stripe en modo de prueba y nunca se realiza un cargo real.",
    ],
  },
  {
    heading: "Quién vende",
    paragraphs: [
      "Cada producto es vendido por el negocio que aparece como \"Vendido por\" en su ficha. La compra es entre tú y ese negocio; Omnara pone la plataforma, cobra el pago a través de Stripe y interviene en devoluciones y disputas como se explica más abajo.",
    ],
  },
  {
    heading: "Tu cuenta",
    items: [
      "Puedes navegar y comprar sin cuenta. Necesitas una para ver tus pedidos, escribir reseñas, hacer preguntas, guardar direcciones y pedir devoluciones.",
      "Eres responsable de la información de tu cuenta y de mantener tu contraseña en secreto.",
      "Debes dar datos verdaderos y no usar la plataforma para actividades ilegales o para perjudicar a otras personas.",
    ],
  },
  {
    heading: "Precios, pagos y envío",
    items: [
      "Los precios se muestran en pesos mexicanos y, si lo eliges, en dólares con el tipo de cambio de la tienda. El monto que se cobra es el que ves al pagar.",
      "El envío tiene un costo fijo y es gratis a partir del monto mostrado en el pago. Los vendedores envían sus propios artículos, por lo que un mismo pedido puede llegar en envíos separados.",
      "Los códigos promocionales tienen sus propias condiciones (monto mínimo, vigencia y límite de usos).",
    ],
  },
  {
    heading: "Devoluciones y reembolsos",
    items: [
      "Puedes pedir la devolución de un artículo hasta 30 días después de que fue enviado, desde el detalle de tu pedido.",
      "El vendedor revisa la solicitud. Si la rechaza, puedes abrir una disputa y Omnara decide.",
      "Si se aprueba, el reembolso se envía al método de pago original a través de Stripe. Corresponde al precio del artículo menos la parte proporcional de cualquier descuento aplicado; el costo de envío no se reembolsa.",
    ],
  },
  {
    heading: "Reseñas y preguntas",
    items: [
      "Solo quienes compraron un producto pueden reseñarlo; esas reseñas llevan la marca de compra verificada. Las preguntas a los vendedores son públicas.",
      "Debes ser honesto y respetuoso. Omnara puede ocultar reseñas o preguntas que sean ofensivas, falsas o ajenas al producto.",
    ],
  },
  {
    heading: "Para vendedores",
    items: [
      "Para vender debes enviar una solicitud con tus datos y un documento de identificación; Omnara puede aprobarla o rechazarla.",
      "Te comprometes a publicar información veraz de tus productos, mantener tu inventario al día, enviar los pedidos y registrar el número de rastreo, y responder a compradores y devoluciones.",
      "Omnara puede pausar un negocio, lo que oculta sus productos, si incumple estos términos.",
    ],
  },
  {
    heading: "Limitación de responsabilidad",
    paragraphs: [
      "Omnara es un proyecto académico ofrecido tal como está, sin garantías. En la medida que permita la ley, el equipo no responde por daños derivados del uso de la plataforma ni por incumplimientos de los vendedores, sin perjuicio de lo previsto en la sección de devoluciones.",
    ],
  },
  {
    heading: "Cambios y ley aplicable",
    paragraphs: [
      "Podemos actualizar estos términos y publicaremos la versión nueva en esta página con su fecha. Se rigen por las leyes de los Estados Unidos Mexicanos.",
    ],
  },
];

const EN: LegalSection[] = [
  {
    heading: "What Omnara is",
    paragraphs: [
      "Omnara is a marketplace: a platform where independent (student) businesses sell their products under one catalog, cart and checkout. It is an academic project at IUEM and runs in test mode: payments use Stripe in test mode and no real charge is ever made.",
    ],
  },
  {
    heading: "Who sells",
    paragraphs: [
      "Each product is sold by the business shown as \"Sold by\" on its page. The purchase is between you and that business; Omnara provides the platform, collects the payment through Stripe and steps in on returns and disputes as explained below.",
    ],
  },
  {
    heading: "Your account",
    items: [
      "You can browse and buy without an account. You need one to see your orders, write reviews, ask questions, save addresses and request returns.",
      "You are responsible for your account information and for keeping your password secret.",
      "You must give truthful information and not use the platform for illegal activity or to harm others.",
    ],
  },
  {
    heading: "Prices, payment and shipping",
    items: [
      "Prices are shown in Mexican pesos and, if you choose, in US dollars at the store's exchange rate. The amount charged is the one you see at checkout.",
      "Shipping has a flat cost and is free above the amount shown at checkout. Sellers ship their own items, so one order can arrive in separate shipments.",
      "Promo codes have their own conditions (minimum order, validity and usage limit).",
    ],
  },
  {
    heading: "Returns and refunds",
    items: [
      "You can request a return of an item up to 30 days after it shipped, from your order page.",
      "The seller reviews the request. If they reject it, you can open a dispute and Omnara decides.",
      "If approved, the refund goes back to the original payment method through Stripe. It equals the item's price minus its proportional share of any discount applied; shipping is not refunded.",
    ],
  },
  {
    heading: "Reviews and questions",
    items: [
      "Only people who bought a product can review it; those reviews carry the Verified purchase badge. Questions to sellers are public.",
      "Be honest and respectful. Omnara may hide reviews or questions that are offensive, false or unrelated to the product.",
    ],
  },
  {
    heading: "For sellers",
    items: [
      "To sell you must send an application with your details and an identity document; Omnara may approve or reject it.",
      "You agree to publish truthful product information, keep inventory up to date, ship orders and record the tracking number, and respond to buyers and returns.",
      "Omnara may pause a business, which hides its products, if it breaches these terms.",
    ],
  },
  {
    heading: "Limitation of liability",
    paragraphs: [
      "Omnara is an academic project provided as is, without warranties. To the extent the law allows, the team is not liable for damages from using the platform or for sellers' failures, without prejudice to the returns section.",
    ],
  },
  {
    heading: "Changes and governing law",
    paragraphs: [
      "We may update these terms and will publish the new version on this page with its date. They are governed by the laws of the United Mexican States.",
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
