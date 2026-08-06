"use client";

import { useEffect, useRef, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cartItemCount, useCartStore } from "@/stores/cart-store";

export function CartButton({ label }: { label: string }) {
  const items = useCartStore((state) => state.items);
  const count = cartItemCount(items);
  const [bump, setBump] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count !== prevCount.current) {
      setBump(true);
      const timeout = setTimeout(() => setBump(false), 320);
      prevCount.current = count;
      return () => clearTimeout(timeout);
    }
  }, [count]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      nativeButton={false}
      aria-label={label}
      render={
        <Link href="/carrito">
          <ShoppingCart className="size-5" />
          {count > 0 ? (
            <Badge
              className={`absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px] ${bump ? "animate-bump" : ""}`}
            >
              {count > 9 ? "9+" : count}
            </Badge>
          ) : null}
        </Link>
      }
    />
  );
}
