import {
  formatTicketDate,
  ticketAddressLines,
  ticketItemLabel,
  ticketMoney,
  ticketShipmentStatus,
  TICKET_NOTICE,
  type Locale,
  type Ticket,
} from "@/lib/ticket";

// A small, dependency-free PDF writer for the purchase ticket: A4, the two standard Helvetica
// fonts (always available in every PDF reader, so nothing is embedded) with WinAnsi encoding,
// which covers Spanish accents and ñ. Long lists continue on new pages.

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 50;
const BOTTOM = 60;

// Helvetica advance widths (1/1000 em) for ASCII 32..126. Accented letters share their base
// letter's width; bold is close enough for layout except digits and punctuation, which are equal.
const WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];

const ACCENTS: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ñ: "n", ü: "u", Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ñ: "N", Ü: "U",
};

function charWidth(char: string): number {
  const base = ACCENTS[char] ?? char;
  const code = base.charCodeAt(0);
  return code >= 32 && code <= 126 ? WIDTHS[code - 32] : 556;
}

function textWidth(text: string, size: number, bold = false): number {
  let units = 0;
  for (const char of text) units += charWidth(char);
  return (units / 1000) * size * (bold ? 1.05 : 1);
}

/** Text safe for a WinAnsi PDF string: punctuation mapped, anything outside Latin-1 becomes "?". */
function clean(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[  ]/g, " ")
    .replace(/[^\x20-\x7e¡-ÿ]/g, "?");
}

function escapePdf(text: string): string {
  return clean(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Splits text into lines no wider than maxWidth. */
function wrap(text: string, size: number, maxWidth: number, bold = false): string[] {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

class Page {
  ops: string[] = [];
  text(x: number, y: number, value: string, size = 10, bold = false, gray = 0) {
    this.ops.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf ${gray} g ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdf(value)}) Tj ET`
    );
  }
  right(xRight: number, y: number, value: string, size = 10, bold = false, gray = 0) {
    this.text(xRight - textWidth(clean(value), size, bold), y, value, size, bold, gray);
  }
  line(x1: number, y1: number, x2: number, y2: number) {
    this.ops.push(`0.75 G 0.6 w ${x1} ${y1} m ${x2} ${y2} l S`);
  }
}

const COPY = {
  es: {
    title: "Comprobante de compra",
    subtitle: "Omnara · proyecto educativo de demostración",
    order: "Pedido",
    date: "Fecha",
    email: "Correo",
    estimated: "Entrega estimada",
    shipTo: "Enviar a",
    product: "Producto",
    qty: "Cant.",
    price: "Precio",
    amount: "Importe",
    subtotal: "Subtotal",
    shipping: "Envío",
    discount: "Descuento",
    total: "Total",
    shipments: "Envíos",
    guide: "Guía",
    page: "Página",
    demoPay: "Pago simulado: no se realizó ningún cargo.",
  },
  en: {
    title: "Purchase receipt",
    subtitle: "Omnara · educational demo project",
    order: "Order",
    date: "Date",
    email: "Email",
    estimated: "Estimated delivery",
    shipTo: "Ship to",
    product: "Product",
    qty: "Qty",
    price: "Price",
    amount: "Amount",
    subtotal: "Subtotal",
    shipping: "Shipping",
    discount: "Discount",
    total: "Total",
    shipments: "Shipments",
    guide: "Tracking",
    page: "Page",
    demoPay: "Simulated payment: no charge was made.",
  },
};

export function buildTicketPdf(ticket: Ticket, locale: Locale): Uint8Array {
  const t = COPY[locale];
  const money = (cents: number) => ticketMoney(cents, ticket, locale);
  const pages: Page[] = [];
  let page = new Page();
  pages.push(page);
  let y = PAGE_H - MARGIN;

  const ensure = (needed: number) => {
    if (y - needed < BOTTOM) {
      page = new Page();
      pages.push(page);
      y = PAGE_H - MARGIN;
    }
  };
  const RIGHT = PAGE_W - MARGIN;
  const COL_QTY = 340;
  const COL_PRICE = 430;

  page.text(MARGIN, y, t.title, 20, true);
  y -= 18;
  page.text(MARGIN, y, t.subtitle, 10, false, 0.4);
  y -= 22;

  for (const line of wrap(TICKET_NOTICE[locale], 8.5, PAGE_W - 2 * MARGIN, true)) {
    page.text(MARGIN, y, line, 8.5, true, 0.25);
    y -= 11;
  }
  y -= 8;
  page.line(MARGIN, y, RIGHT, y);
  y -= 18;

  const info: [string, string][] = [
    [t.order, ticket.order_number],
    [t.date, formatTicketDate(ticket.created_at, locale)],
  ];
  if (ticket.customer_email) info.push([t.email, ticket.customer_email]);
  if (ticket.estimated_delivery_at) info.push([t.estimated, formatTicketDate(ticket.estimated_delivery_at, locale)]);
  for (const [label, value] of info) {
    page.text(MARGIN, y, `${label}:`, 10, true);
    page.text(MARGIN + 110, y, value, 10);
    y -= 15;
  }
  if (ticket.demo) {
    page.text(MARGIN, y, t.demoPay, 9, false, 0.4);
    y -= 15;
  }

  const address = ticketAddressLines(ticket);
  if (address.length) {
    y -= 6;
    page.text(MARGIN, y, `${t.shipTo}:`, 10, true);
    y -= 14;
    for (const line of address) {
      page.text(MARGIN, y, line, 10);
      y -= 13;
    }
  }

  y -= 12;
  const header = () => {
    page.text(MARGIN, y, t.product, 9, true);
    page.right(COL_QTY, y, t.qty, 9, true);
    page.right(COL_PRICE, y, t.price, 9, true);
    page.right(RIGHT, y, t.amount, 9, true);
    y -= 6;
    page.line(MARGIN, y, RIGHT, y);
    y -= 14;
  };
  header();

  for (const item of ticket.items) {
    const lines = wrap(ticketItemLabel(item, locale), 10, COL_QTY - MARGIN - 40);
    const seller = item.seller ? 1 : 0;
    ensure(lines.length * 13 + seller * 11 + 14);
    if (y === PAGE_H - MARGIN) header();
    lines.forEach((line, index) => {
      page.text(MARGIN, y, line, 10);
      if (index === 0) {
        page.right(COL_QTY, y, String(item.quantity), 10);
        page.right(COL_PRICE, y, money(item.unit_price_cents), 10);
        page.right(RIGHT, y, money(item.unit_price_cents * item.quantity), 10);
      }
      y -= 13;
    });
    if (item.seller) {
      page.text(MARGIN, y, clean(item.seller), 8.5, false, 0.45);
      y -= 11;
    }
    y -= 3;
  }

  ensure(90);
  y -= 4;
  page.line(MARGIN, y, RIGHT, y);
  y -= 16;
  const totals: [string, string, boolean][] = [[t.subtotal, money(ticket.subtotal_cents), false]];
  if (ticket.discount_cents > 0) {
    totals.push([`${t.discount}${ticket.promo_code ? ` (${ticket.promo_code})` : ""}`, `-${money(ticket.discount_cents)}`, false]);
  }
  totals.push([t.shipping, money(ticket.shipping_cents), false]);
  totals.push([t.total, money(ticket.total_cents), true]);
  for (const [label, value, bold] of totals) {
    page.right(COL_PRICE, y, label, bold ? 11 : 10, bold);
    page.right(RIGHT, y, value, bold ? 11 : 10, bold);
    y -= bold ? 17 : 14;
  }

  if (ticket.shipments.length) {
    ensure(40 + ticket.shipments.length * 14);
    y -= 10;
    page.text(MARGIN, y, `${t.shipments}:`, 10, true);
    y -= 14;
    for (const shipment of ticket.shipments) {
      const parts = [
        shipment.seller ?? "",
        ticketShipmentStatus(shipment.status, locale),
        shipment.tracking_number ? `${t.guide}: ${shipment.tracking_number}` : "",
      ].filter(Boolean);
      page.text(MARGIN, y, parts.join("  ·  "), 9.5);
      y -= 13;
    }
  }

  // footer with page numbers (known only now)
  pages.forEach((p, index) => {
    p.text(MARGIN, 30, "Omnara", 8, false, 0.5);
    p.right(RIGHT, 30, `${t.page} ${index + 1}/${pages.length}`, 8, false, 0.5);
  });

  return assemble(pages);
}

/** Wraps the pages into a valid PDF 1.4 file with a cross-reference table. */
function assemble(pages: Page[]): Uint8Array {
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length; // object number
  };

  add("<< /Type /Catalog /Pages 2 0 R >>"); // 1
  const kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  add(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`); // 2
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"); // 3
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"); // 4

  pages.forEach((p, i) => {
    const content = p.ops.join("\n");
    const contentNumber = 6 + i * 2;
    add(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNumber} 0 R >>`
    ); // 5 + 2i
    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); // 6 + 2i
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  // Every character is Latin-1, so one char is one byte and the offsets above are exact.
  return Uint8Array.from(out, (char) => char.charCodeAt(0) & 0xff);
}
