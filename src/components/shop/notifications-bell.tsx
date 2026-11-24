"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Notification = {
  id: string;
  kind: string;
  title: { es?: string; en?: string };
  body: { es?: string; en?: string };
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type Preferences = { shipment_updates: boolean; sales: boolean };

const POLL_MS = 60_000;

// The Supabase browser client is loaded the first time it is needed, not with the first
// JavaScript of the page.
async function client() {
  const { createClient } = await import("@/lib/supabase/client");
  return createClient();
}

function pick(value: { es?: string; en?: string }, locale: string): string {
  return (locale === "en" ? value.en : value.es) ?? value.es ?? value.en ?? "";
}

/** The bell in the header: unread count, the latest notifications and the two switches. */
export function NotificationsBell({ locale }: { locale: string }) {
  const en = locale === "en";
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const [prefs, setPrefs] = useState<Preferences>({ shipment_updates: true, sales: true });

  const refreshCount = useCallback(async () => {
    try {
      const { data } = await (await client()).rpc("my_unread_notification_count");
      if (typeof data === "number") setCount(data);
    } catch {
      // the bell is a convenience: a failed check just keeps the previous number
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(refreshCount, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshCount();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refreshCount]);

  async function load() {
    try {
      const supabase = await client();
      const [list, preferences] = await Promise.all([
        supabase.rpc("my_notifications", { p_limit: 15 }),
        supabase.from("notification_preferences").select("shipment_updates, sales").maybeSingle(),
      ]);
      setItems((list.data ?? []) as Notification[]);
      if (preferences.data) setPrefs(preferences.data);
    } catch {
      setItems([]);
    }
  }

  async function markAllRead() {
    const supabase = await client();
    await supabase.rpc("mark_notifications_read");
    setCount(0);
    setItems((current) => current?.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() })) ?? null);
  }

  async function openOne(id: string) {
    const supabase = await client();
    await supabase.rpc("mark_notifications_read", { p_ids: [id] });
    void refreshCount();
  }

  async function savePreference(key: keyof Preferences, value: boolean) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    const supabase = await client();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("notification_preferences").upsert({ user_id: data.user.id, ...next, updated_at: new Date().toISOString() });
  }

  const dateFormat = new Intl.DateTimeFormat(en ? "en-US" : "es-MX", { dateStyle: "medium", timeStyle: "short" });

  return (
    <DropdownMenu onOpenChange={(open) => (open ? void load() : undefined)}>
      <DropdownMenuTrigger
        className={`${buttonVariants({ variant: "ghost", size: "icon" })} relative`}
        aria-label={en ? `Notifications${count ? `, ${count} unread` : ""}` : `Notificaciones${count ? `, ${count} sin leer` : ""}`}
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <Badge className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
            {count > 9 ? "9+" : count}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuLabel className="p-0">{en ? "Notifications" : "Notificaciones"}</DropdownMenuLabel>
          {count > 0 ? (
            <button type="button" onClick={() => void markAllRead()} className="text-xs text-primary underline-offset-2 hover:underline">
              {en ? "Mark all as read" : "Marcar todo como leído"}
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {items === null ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{en ? "Loading…" : "Cargando…"}</p>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {en ? "Nothing yet. Your order updates will show up here." : "Aún no hay nada. Aquí verás las novedades de tus pedidos."}
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((item) => {
              const content = (
                <span className="flex flex-col gap-0.5">
                  <span className={item.read_at ? "text-sm" : "text-sm font-semibold"}>{pick(item.title, locale)}</span>
                  <span className="text-xs text-muted-foreground">{pick(item.body, locale)}</span>
                  <span className="text-[11px] text-muted-foreground">{dateFormat.format(new Date(item.created_at))}</span>
                </span>
              );
              return item.link ? (
                <DropdownMenuItem key={item.id} onClick={() => void openOne(item.id)} render={<Link href={item.link}>{content}</Link>} />
              ) : (
                <DropdownMenuItem key={item.id}>{content}</DropdownMenuItem>
              );
            })}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {en ? "Notify me about" : "Avisarme de"}
        </DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={prefs.shipment_updates}
          onCheckedChange={(value) => void savePreference("shipment_updates", value)}
        >
          {en ? "My orders' progress" : "El avance de mis pedidos"}
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={prefs.sales} onCheckedChange={(value) => void savePreference("sales", value)}>
          {en ? "New sales (sellers)" : "Nuevas ventas (vendedores)"}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
