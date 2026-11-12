"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveApplication, rejectApplication } from "../actions";

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function ReviewActions({
  locale,
  applicationId,
  businessName,
}: {
  locale: string;
  applicationId: string;
  businessName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [slug, setSlug] = useState(slugify(businessName));
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const en = locale === "en";
  const t = {
    slug: en ? "Public address (slug)" : "Dirección pública (slug)",
    approve: en ? "Approve and create business" : "Aprobar y crear negocio",
    reject: en ? "Reject" : "Rechazar",
    reason: en ? "Reason (the applicant will see it)" : "Motivo (lo verá el solicitante)",
    confirmReject: en ? "Confirm rejection" : "Confirmar rechazo",
    cancel: en ? "Cancel" : "Cancelar",
    approved: en ? "Application approved." : "Solicitud aprobada.",
    rejected: en ? "Application rejected." : "Solicitud rechazada.",
  };

  function run(action: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Error");
      }
    });
  }

  return (
    <div className="mt-4 grid gap-3 border-t pt-4">
      {rejecting ? (
        <>
          <Input
            value={reason}
            maxLength={300}
            placeholder={t.reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => rejectApplication(applicationId, reason), t.rejected)}
            >
              {t.confirmReject}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setRejecting(false)}>
              {t.cancel}
            </Button>
          </div>
        </>
      ) : (
        <>
          <label className="grid gap-1 text-sm">
            <span className="font-medium">{t.slug}</span>
            <Input
              className="max-w-xs font-mono"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={pending || slug.length < 2}
              onClick={() => run(() => approveApplication(applicationId, slug), t.approved)}
            >
              {t.approve}
            </Button>
            <Button type="button" variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
              {t.reject}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
