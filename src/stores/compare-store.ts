import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const MAX_COMPARE = 4;

type CompareState = {
  /** Product ids, in the order they were added. */
  ids: string[];
  /** Returns false when the list is already full and the id was not added. */
  add: (id: string) => boolean;
  remove: (id: string) => void;
  toggle: (id: string) => "added" | "removed" | "full";
  clear: () => void;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) => {
        const { ids } = get();
        if (ids.includes(id)) return true;
        if (ids.length >= MAX_COMPARE) return false;
        set({ ids: [...ids, id] });
        return true;
      },
      remove: (id) => set((state) => ({ ids: state.ids.filter((i) => i !== id) })),
      toggle: (id) => {
        const { ids, add, remove } = get();
        if (ids.includes(id)) {
          remove(id);
          return "removed";
        }
        return add(id) ? "added" : "full";
      },
      clear: () => set({ ids: [] }),
    }),
    {
      name: "omnara-compare",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

export function useCompareHydrated() {
  return useSyncExternalStore(
    (callback) => useCompareStore.persist.onFinishHydration(callback),
    () => useCompareStore.persist.hasHydrated(),
    () => false
  );
}
