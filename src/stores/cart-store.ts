import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  variantId: string;
  productSlug: string;
  name: string;
  image: string | null;
  size: string | null;
  color: string | null;
  unitPriceMxnCents: number;
  /** The seller (null: sold by Omnara). Old saved carts do not have it and count as Omnara. */
  vendorId?: string | null;
  quantity: number;
  stockQuantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clear: () => void;
  /** Brings saved lines in line with the shop: new price, less stock, or the line removed. */
  syncWith: (current: { variantId: string; priceMxnCents: number; stockQuantity: number; available: boolean }[]) => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            const nextQuantity = Math.min(
              existing.quantity + quantity,
              existing.stockQuantity
            );
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: nextQuantity } : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { ...item, quantity: Math.min(quantity, item.stockQuantity) },
            ],
          };
        }),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.variantId !== variantId)
              : state.items.map((i) =>
                  i.variantId === variantId
                    ? { ...i, quantity: Math.min(quantity, i.stockQuantity) }
                    : i
                ),
        })),
      clear: () => set({ items: [] }),
      syncWith: (current) =>
        set((state) => {
          const byId = new Map(current.map((variant) => [variant.variantId, variant]));
          return {
            items: state.items.flatMap((item) => {
              const now = byId.get(item.variantId);
              if (!now || !now.available || now.stockQuantity < 1) return [];
              return [
                {
                  ...item,
                  unitPriceMxnCents: now.priceMxnCents,
                  stockQuantity: now.stockQuantity,
                  quantity: Math.min(item.quantity, now.stockQuantity),
                },
              ];
            }),
          };
        }),
    }),
    {
      name: "omnara-cart",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

export function useCartHydrated() {
  return useSyncExternalStore(
    (callback) => useCartStore.persist.onFinishHydration(callback),
    () => useCartStore.persist.hasHydrated(),
    () => false
  );
}

export function cartItemCount(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function cartSubtotalMxnCents(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.unitPriceMxnCents * item.quantity, 0);
}
