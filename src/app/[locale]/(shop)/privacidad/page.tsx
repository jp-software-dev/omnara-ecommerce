import { Link } from "@/i18n/navigation";
import { LegalDocument, type LegalSection } from "@/components/shop/legal-document";

const ES: LegalSection[] = [
  {
    heading: "Quién es responsable y de qué se trata",
    paragraphs: [
      "Omnara es un marketplace de demostración desarrollado como proyecto académico del IUEM, con fines educativos. El equipo del proyecto es responsable de los datos personales descritos en este aviso. Puedes contactarnos desde la página de Contacto.",
      "Omnara no es una tienda real: ningún producto es real ni se vende realmente, y los pagos se hacen con Stripe en modo de prueba, sin ningún cobro real. Por eso te recomendamos usar datos de ejemplo y no información personal que no quieras compartir.",
    ],
  },
  {
    heading: "Qué datos guardamos",
    items: [
      "Cuenta: nombre, correo electrónico y contraseña (la contraseña se guarda cifrada por el servicio de autenticación; nosotros no la vemos). También tu rol (cliente, vendedor o administrador) y tus preferencias de idioma y moneda.",
      "Pedidos de prueba: artículos, montos, correo de contacto, dirección de envío, número de rastreo de ejemplo y estado.",
      "Direcciones guardadas: las que tú registras en tu libreta.",
      "Reseñas, preguntas a vendedores, lista de favoritos, devoluciones de prueba y los mensajes que intercambias en ellas.",
      "Si solicitas vender: los datos de tu negocio, tu teléfono y el documento de identificación que subes.",
      "Mensajes que nos envías por el formulario de contacto.",
      "En tu navegador (no en nuestros servidores): tu carrito, la lista de productos que comparas, tu moneda y el tema visual.",
    ],
  },
  {
    heading: "Para qué los usamos",
    paragraphs: ["Solo para que el proyecto funcione y con fines educativos. No los usamos para publicidad ni con fines comerciales."],
    items: [
      "Crear y mantener tu cuenta y simular compras, envíos, devoluciones y reembolsos.",
      "Enviarte correos de demostración sobre tus pedidos y devoluciones de prueba, cuando el envío de correos está configurado.",
      "Revisar las solicitudes de quienes participan como vendedores en el ejercicio.",
      "Atender tus mensajes, prevenir abusos y mantener un registro de los cambios que hacen los administradores.",
    ],
  },
  {
    heading: "Con quién se comparten",
    items: [
      "Los negocios participantes: en una compra de prueba, el negocio de cada artículo ve los datos del pedido, que incluyen tu nombre, dirección de envío y correo de contacto. No ven tus otros pedidos ni tus datos de cuenta. Por eso conviene usar datos de ejemplo.",
      "Stripe procesa el pago en modo de prueba: no se realiza ningún cobro real y no debes ingresar una tarjeta real.",
      "Supabase aloja la base de datos, la autenticación y los archivos; Vercel aloja el sitio; Resend envía los correos cuando está configurado.",
      "El documento de identificación de quien solicita vender se guarda en un espacio privado y solo lo pueden ver los administradores.",
      "No vendemos tus datos.",
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
      "Es un proyecto educativo: los datos se conservan mientras dure el proyecto y pueden borrarse en cualquier momento, por ejemplo al reiniciar la base de demostración o al terminar el curso. Como no hay ventas reales, los pedidos y pagos de esta plataforma no son operaciones comerciales reales.",
    ],
  },
  {
    heading: "Tus derechos (acceso, rectificación, cancelación y oposición)",
    items: [
      "Acceso: puedes descargar una copia de tus datos en formato JSON desde Mi cuenta → Privacidad.",
      "Rectificación: puedes editar tus direcciones y, para corregir cualquier otro dato, escribirnos desde Contacto.",
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
    heading: "Who is responsible and what this is about",
    paragraphs: [
      "Omnara is a demonstration marketplace built as an academic project at IUEM, for educational purposes. The project team is responsible for the personal data described in this notice. You can reach us from the Contact page.",
      "Omnara is not a real store: no product is real or actually sold, and payments use Stripe in test mode, with no real charge. For that reason we recommend using sample data and not personal information you don't want to share.",
    ],
  },
  {
    heading: "What data we keep",
    items: [
      "Account: name, email and password (the password is stored encrypted by the authentication service; we never see it). Also your role (customer, seller or administrator) and your language and currency preferences.",
      "Test orders: items, amounts, contact email, shipping address, sample tracking number and status.",
      "Saved addresses: the ones you add to your address book.",
      "Reviews, questions to sellers, your wishlist, test returns and the messages you exchange in them.",
      "If you apply to sell: your business details, phone number and the identity document you upload.",
      "Messages you send through the contact form.",
      "In your browser (not on our servers): your cart, the products you compare, your currency and the visual theme.",
    ],
  },
  {
    heading: "What we use it for",
    paragraphs: ["Only to make the project work and for educational purposes. We do not use it for advertising or commercial purposes."],
    items: [
      "Creating and maintaining your account and simulating purchases, shipping, returns and refunds.",
      "Emailing you demonstration messages about your test orders and returns, when email sending is configured.",
      "Reviewing the applications of people taking part as sellers in the exercise.",
      "Answering your messages, preventing abuse and keeping a record of the changes administrators make.",
    ],
  },
  {
    heading: "Who it is shared with",
    items: [
      "Participating businesses: in a test purchase, the business behind each item sees the order details, which include your name, shipping address and contact email. They do not see your other orders or your account data. That is why sample data is a good idea.",
      "Stripe processes the payment in test mode: no real charge is made and you must not enter a real card.",
      "Supabase hosts the database, authentication and files; Vercel hosts the site; Resend sends the emails when configured.",
      "The identity document of someone applying to sell is kept in a private space that only administrators can see.",
      "We do not sell your data.",
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
      "This is an educational project: data is kept while the project lasts and may be deleted at any time, for example when the demo database is reset or the course ends. Because there are no real sales, the orders and payments on this platform are not real commercial operations.",
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
      notice={
        en
          ? "Educational test project: no product is real or actually sold. Please use sample data."
          : "Proyecto educativo de prueba: ningún producto es real ni se vende realmente. Usa datos de ejemplo."
      }
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
