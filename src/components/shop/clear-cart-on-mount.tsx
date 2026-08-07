"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";

export function ClearCartOnMount() {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);

  return null;
}
