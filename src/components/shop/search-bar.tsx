"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";

export function SearchBar({ locale }: { locale: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const q = value.trim();
    if (!q) return;
    router.push(`/buscar?q=${encodeURIComponent(q)}`);
  }

  const placeholder = locale === "en" ? "Search products" : "Buscar productos";

  return (
    <form onSubmit={handleSubmit} className="relative hidden w-full max-w-xs md:block">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="pl-8"
      />
    </form>
  );
}
