import { useTranslations } from "next-intl";

export default function CartPage() {
  const t = useTranslations("common");

  return (
    <main className="flex-1 p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t("cart")}</h1>
    </main>
  );
}
