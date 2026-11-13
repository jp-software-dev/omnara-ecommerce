import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">{t("brand")}</p>
            <p className="mt-1 max-w-xs">{locale === "en" ? "Everything in one place (demo)." : "Todo en un solo lugar (demo)."}</p>
          </div>
          <div className="flex gap-10">
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground">Ayuda</span>
              <Link href="/ayuda">Preguntas frecuentes</Link>
              <Link href="/ayuda#envios">Envíos y devoluciones</Link>
              <Link href="/contacto">Contacto</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground">{locale === "en" ? "Sell" : "Vender"}</span>
              <Link href="/vender">{locale === "en" ? "Sell on Omnara" : "Vende en Omnara"}</Link>
              <Link href="/negocios">{locale === "en" ? "Businesses" : "Negocios"}</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground">Legal</span>
              <Link href="/terminos">Términos de servicio</Link>
              <Link href="/privacidad">Aviso de privacidad</Link>
            </div>
          </div>
        </div>
        <p className="mt-8 border-t pt-6">
          © {year} {t("brand")}.{" "}
          {locale === "en"
            ? "Educational demo project: no product is real or actually sold."
            : "Proyecto educativo de demostración: ningún producto es real ni se vende realmente."}
        </p>
      </div>
    </footer>
  );
}
