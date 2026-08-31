import { Badge } from "@/components/ui/badge";
import { getContactMessages } from "@/lib/supabase/admin-queries";
import { requireRole } from "@/lib/supabase/auth-helpers";
import { MarkReadButton } from "./mark-read-button";

export default async function AdminMessagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(["admin"], locale);

  const messages = await getContactMessages();

  const t = {
    title: locale === "en" ? "Messages" : "Mensajes",
    empty: locale === "en" ? "No messages yet." : "Todavía no hay mensajes.",
    new: locale === "en" ? "New" : "Nuevo",
    read: locale === "en" ? "Read" : "Leído",
    markRead: locale === "en" ? "Mark as read" : "Marcar como leído",
  };

  return (
    <main className="flex-1 p-6 md:p-10">
      <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>

      {messages.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-4">
          {messages.map((message) => (
            <li key={message.id} className="rounded-lg border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {message.name} <span className="text-muted-foreground">· {message.email}</span>
                  </p>
                  {message.subject ? <p className="text-sm font-medium">{message.subject}</p> : null}
                  <p className="mt-1 text-sm text-muted-foreground">{message.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Date(message.created_at).toLocaleString(locale === "en" ? "en-US" : "es-MX")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={message.status === "new" ? "default" : "secondary"}>
                    {message.status === "new" ? t.new : t.read}
                  </Badge>
                  {message.status === "new" ? (
                    <MarkReadButton messageId={message.id} label={t.markRead} />
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
