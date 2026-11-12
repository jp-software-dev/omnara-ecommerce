import { Link } from "@/i18n/navigation";
import { LegalDocument, type LegalSection } from "@/components/shop/legal-document";

const ES: LegalSection[] = [
  {
    heading: "Quién es responsable",
    paragraphs: [
      "Omnara es un marketplace desarrollado como proyecto académico del IUEM. El equipo del proyecto es responsable del tratamiento de los datos personales descritos en este aviso. Puedes contactarnos desde la página de Contacto.",
      "Omnara funciona en modo de prueba: los pagos se hacen con Stripe en modo de prueba y nunca se realiza un cargo real.",
    ],
  },
  {
    heading: "Qué datos guardamos",
    items: [
      "Cuenta: nombre, correo electrónico y contraseña (la contraseña se guarda cifrada por el servicio de autenticación; nosotros no la vemos). También tu rol (cliente, vendedor o administrador) y tus preferencias de idioma y moneda.",
      "Pedidos: artículos, montos, correo de contacto, dirección de envío, número de rastreo y estado.",
      "Direcciones guardadas: las que tú registras en tu libreta.",
      "Reseñas, preguntas a vendedores, lista de favoritos, devoluciones y los mensajes que intercambias en ellas.",
      "Si solicitas vender: los datos de tu negocio, tu teléfono y el documento de identificación que subes.",
      "Mensajes que nos envías por el formulario de contacto.",
      "En tu navegador (no en nuestros servidores): tu carrito, la lista de productos que comparas, tu moneda y el tema visual.",
    ],
  },
  {
    heading: "Para qué los usamos",
    items: [
      "Crear y mantener tu cuenta, procesar tus compras y gestionar envíos, devoluciones y reembolsos.",
      "Enviarte correos sobre tus pedidos y devoluciones (confirmación, envío, resultado de una devolución). No enviamos publicidad.",
      "Verificar a los vendedores antes de aprobar su negocio.",
      "Atender tus mensajes, prevenir abusos y mantener un registro de los cambios que hacen los administradores.",
    ],
  },
  {
    heading: "Con quién se comparten",
    items: [
      "Los vendedores: cuando compras, el vendedor de cada artículo recibe los datos del pedido necesarios para enviarlo, que incluyen tu nombre, dirección de envío y correo de contacto. No ven tus otros pedidos ni tus datos de cuenta.",
      "Stripe procesa el pago. Los datos de tu tarjeta los captura Stripe y nunca pasan por nuestros servidores.",
      "Supabase aloja la base de datos, la autenticación y los archivos; Vercel aloja el sitio; Resend envía los correos cuando está configurado.",
      "El documento de identificación de quien solicita vender se guarda en un espacio privado y solo lo pueden ver los administradores.",
      "No vendemos tus datos ni los usamos para publicidad.",
    ],
  },
  {
    heading: "Cookies y almacenamiento local",
    paragraphs: [
      "Usamos únicamente lo necesario para que el sitio funcione: la sesión de tu cuenta y, en tu navegador, el carrito, la comparación de productos, la moneda y el tema. No usamos cookies de publicidad ni de seguimiento.",
    ],
  },
  {
    heading: "Cuánto tiempo los conservamos",
    paragraphs: [
      "Conservamos los datos de tu cuenta mientras la mantengas. Los registros de pedidos, pagos y devoluciones se conservan el tiempo necesario para cumplir obligaciones legales y resolver disputas; si eliminas tu cuenta, esos registros se conservan sin tus datos de contacto cuando sea posible.",
    ],
  },
  {
    heading: "Tus derechos (acceso, rectificación, cancelación y oposición)",
    items: [
      "Acceso: puedes descargar una copia de tus datos en formato JSON desde Mi cuenta → Privacidad.",
      "Rectificación: puedes editar tus direcciones y, si necesitas corregir otro dato, escribirnos desde Contacto.",
      "Cancelación: puedes solicitar la eliminación de tu cuenta desde Mi cuenta → Privacidad. Un administrador la atiende y te avisa.",
      "Oposición: puedes pedirnos dejar de usar tus datos para un fin concreto escribiéndonos desde Contacto.",
    ],
  },
  {
    heading: "Cambios a este aviso",
    paragraphs: ["Si cambiamos este aviso, publicaremos la nueva versión en esta página con su fecha de actualización."],
  },
];

const EN: LegalSection[] = [
  {
    heading: "Who is responsible",
    paragraphs: [
      "Omnara is a marketplace built as an academic project at IUEM. The project team is responsible for the personal data described in this notice. You can reach us from the Contact page.",
      "Omnara runs in test mode: payments use Stripe in test mode and no real charge is ever made.",
    ],
  },
  {
    heading: "What data we keep",
    items: [
      "Account: name, email and password (the password is stored encrypted by the authentication service; we never see it). Also your role (customer, seller or administrator) and your language and currency preferences.",
      "Orders: items, amounts, contact email, shipping address, tracking number and status.",
      "Saved addresses: the ones you add to your address book.",
      "Reviews, questions to sellers, your wishlist, returns and the messages you exchange in them.",
      "If you apply to sell: your business details, phone number and the identity document you upload.",
      "Messages you send through the contact form.",
      "In your browser (not on our servers): your cart, the products you compare, your currency and the visual theme.",
    ],
  },
  {
    heading: "What we use it for",
    items: [
      "Creating and maintaining your account, processing your purchases and handling shipping, returns and refunds.",
      "Emailing you about your orders and returns (confirmation, shipment, return outcome). We send no advertising.",
      "Verifying sellers before approving their business.",
      "Answering your messages, preventing abuse and keeping a record of the changes administrators make.",
    ],
  },
  {
    heading: "Who it is shared with",
    items: [
      "Sellers: when you buy, the seller of each item receives the order details needed to ship it, including your name, shipping address and contact email. They do not see your other orders or your account data.",
      "Stripe processes the payment. Your card details are captured by Stripe and never pass through our servers.",
      "Supabase hosts the database, authentication and files; Vercel hosts the site; Resend sends the emails when configured.",
      "The identity document of someone applying to sell is kept in a private space that only administrators can see.",
      "We do not sell your data or use it for advertising.",
    ],
  },
  {
    heading: "Cookies and local storage",
    paragraphs: [
      "We only use what the site needs to work: your account session and, in your browser, the cart, product comparison, currency and theme. We use no advertising or tracking cookies.",
    ],
  },
  {
    heading: "How long we keep it",
    paragraphs: [
      "We keep your account data while you keep the account. Order, payment and return records are kept as long as needed to meet legal obligations and resolve disputes; if you delete your account, those records are kept without your contact details where possible.",
    ],
  },
  {
    heading: "Your rights (access, rectification, cancellation and objection)",
    items: [
      "Access: you can download a copy of your data as JSON from My account → Privacy.",
      "Rectification: you can edit your addresses and, to correct anything else, write to us from Contact.",
      "Cancellation: you can request deletion of your account from My account → Privacy. An administrator handles it and lets you know.",
      "Objection: you can ask us to stop using your data for a specific purpose by writing to us from Contact.",
    ],
  },
  {
    heading: "Changes to this notice",
    paragraphs: ["If we change this notice, we will publish the new version on this page with its update date."],
  },
];

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const en = locale === "en";

  return (
    <LegalDocument
      title={en ? "Privacy notice" : "Aviso de privacidad"}
      updated={en ? "Last updated: November 12, 2026" : "Última actualización: 12 de noviembre de 2026"}
      intro={
        en
          ? "This notice explains what personal data Omnara handles, why, and what you can do about it."
          : "Este aviso explica qué datos personales maneja Omnara, para qué y qué puedes hacer con ellos."
      }
      sections={en ? EN : ES}
      footer={
        <p>
          <Link href="/cuenta/privacidad" className="font-medium underline underline-offset-4">
            {en ? "Manage my data" : "Administrar mis datos"}
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
