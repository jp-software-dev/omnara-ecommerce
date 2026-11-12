import { ArrowLeft } from "lucide-react";
import { Link, redirect } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getReturnDetail } from "@/lib/supabase/queries";
import { ReturnDetail } from "@/components/shop/return-detail";
import { EscalateForm } from "./escalate-form";

export default async function MyReturnDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const en = locale === "en";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const data = await getReturnDetail(id);
  // RLS also lets the seller and the admin read this row; this is the buyer's section.
  if (!data || data.user_id !== user.id) {
    redirect({ href: "/cuenta/devoluciones", locale });
    return null;
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <Link
        href="/cuenta/devoluciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {en ? "My returns" : "Mis devoluciones"}
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-semibold tracking-tight">{en ? "Return" : "Devolución"}</h1>
      <ReturnDetail
        data={data}
        locale={locale}
        actions={data.status === "rejected" ? <EscalateForm returnId={data.id} locale={locale} /> : undefined}
      />
    </main>
  );
}
