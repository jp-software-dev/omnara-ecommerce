"use client";

import { useState } from "react";
import { Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FOOTWEAR_SIZE_CHART } from "@/lib/size-charts";

const CLOTHING_ROWS = [
  { size: "XS", chest: "82–86", waist: "66–70" },
  { size: "S", chest: "87–91", waist: "71–75" },
  { size: "M", chest: "92–97", waist: "76–81" },
  { size: "L", chest: "98–104", waist: "82–88" },
  { size: "XL", chest: "105–111", waist: "89–95" },
];

export function SizeGuideModal({
  categorySlug,
  locale,
}: {
  categorySlug: string | null | undefined;
  locale: string;
}) {
  const [open, setOpen] = useState(false);
  const isFootwear = categorySlug === "calzado";

  const t = {
    trigger: locale === "en" ? "Size guide" : "Guía de tallas",
    title: locale === "en" ? "Size guide" : "Guía de tallas",
    size: locale === "en" ? "Size" : "Talla",
    chest: locale === "en" ? "Chest (cm)" : "Pecho (cm)",
    waist: locale === "en" ? "Waist (cm)" : "Cintura (cm)",
    cm: "CM",
    mx: "MX",
    us: "US",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4">
        <Ruler className="size-3.5" />
        {t.trigger}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              {isFootwear ? (
                <>
                  <TableHead>{t.cm}</TableHead>
                  <TableHead>{t.mx}</TableHead>
                  <TableHead>{t.us}</TableHead>
                </>
              ) : (
                <>
                  <TableHead>{t.size}</TableHead>
                  <TableHead>{t.chest}</TableHead>
                  <TableHead>{t.waist}</TableHead>
                </>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isFootwear
              ? FOOTWEAR_SIZE_CHART.map((row) => (
                  <TableRow key={row.cm}>
                    <TableCell>{row.cm}</TableCell>
                    <TableCell>{row.mx}</TableCell>
                    <TableCell>{row.us}</TableCell>
                  </TableRow>
                ))
              : CLOTHING_ROWS.map((row) => (
                  <TableRow key={row.size}>
                    <TableCell className="font-medium">{row.size}</TableCell>
                    <TableCell>{row.chest}</TableCell>
                    <TableCell>{row.waist}</TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
