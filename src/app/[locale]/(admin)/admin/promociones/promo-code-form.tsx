"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPromoCode } from "../actions";

export function PromoCodeForm({ locale }: { locale: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrder, setMinOrder] = useState("0");
  const [usageLimit, setUsageLimit] = useState("");
  const [loading, setLoading] = useState(false);

  const t = {
    code: locale === "en" ? "Code" : "Código",
    type: locale === "en" ? "Type" : "Tipo",
    percentage: locale === "en" ? "Percentage" : "Porcentaje",
    fixed: locale === "en" ? "Fixed amount (MXN)" : "Monto fijo (MXN)",
    value: discountType === "percentage" ? (locale === "en" ? "Percent off" : "% de descuento") : (locale === "en" ? "Amount off (MXN)" : "Monto de descuento (MXN)"),
    minOrder: locale === "en" ? "Minimum order (MXN)" : "Pedido mínimo (MXN)",
    usageLimit: locale === "en" ? "Usage limit (optional)" : "Límite de usos (opcional)",
    create: locale === "en" ? "Create code" : "Crear código",
    creating: locale === "en" ? "Creating..." : "Creando...",
    success: locale === "en" ? "Promo code created." : "Código promocional creado.",
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await createPromoCode({
        code,
        discountType,
        // Convention: discount_value is a 0-100 percentage for "percentage",
        // and MXN cents for "fixed" — the admin enters pesos, we store cents.
        discountValue:
          discountType === "fixed" ? Math.round(Number(discountValue) * 100) : Number(discountValue),
        minOrderCents: Math.round(Number(minOrder) * 100),
        usageLimit: usageLimit ? Number(usageLimit) : null,
      });
      toast.success(t.success);
      setCode("");
      setDiscountValue("");
      setMinOrder("0");
      setUsageLimit("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border p-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="promo-code">{t.code}</FieldLabel>
          <Input
            id="promo-code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VERANO15"
            required
          />
        </Field>
        <Field>
          <FieldLabel>{t.type}</FieldLabel>
          <Select value={discountType} onValueChange={(v) => v && setDiscountType(v as "percentage" | "fixed")}>
            <SelectTrigger>
              <SelectValue>
                {(value: string) => (value === "fixed" ? t.fixed : t.percentage)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t.percentage}</SelectItem>
              <SelectItem value="fixed">{t.fixed}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="promo-value">{t.value}</FieldLabel>
          <Input
            id="promo-value"
            type="number"
            min="0"
            step={discountType === "percentage" ? "1" : "0.01"}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="promo-min-order">{t.minOrder}</FieldLabel>
          <Input
            id="promo-min-order"
            type="number"
            min="0"
            step="0.01"
            value={minOrder}
            onChange={(e) => setMinOrder(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="promo-usage-limit">{t.usageLimit}</FieldLabel>
          <Input
            id="promo-usage-limit"
            type="number"
            min="1"
            value={usageLimit}
            onChange={(e) => setUsageLimit(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={loading}>
          {loading ? t.creating : t.create}
        </Button>
      </FieldGroup>
    </form>
  );
}
