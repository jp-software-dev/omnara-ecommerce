import { create } from "zustand";

/**
 * Favorites of the signed-in visitor, loaded ONCE for the whole page.
 *
 * Every product card used to ask Supabase on its own (a session check plus a query per card,
 * so a page with 24 cards made ~48 requests for a signed-in visitor, and pulled the whole
 * Supabase library into the first JavaScript). Now the first card that mounts triggers a
 * single load and all the hearts read from here. The library is imported only when there is
 * a session cookie to look at, so anonymous visitors never download it just to see a page.
 */
type WishlistState = {
  status: "idle" | "loading" | "ready";
  /** Whether the load was done with a session cookie present. */
  signedIn: boolean;
  ids: string[];
  load: () => Promise<void>;
  setFavorite: (productId: string, favorite: boolean) => void;
  reset: () => void;
};

/** The Supabase auth cookie is readable by the browser client (it is not httpOnly). */
export function hasAuthCookie(cookie: string): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token/.test(cookie);
}

/** Pure part of the store, easy to test. */
export function withFavorite(ids: string[], productId: string, favorite: boolean): string[] {
  const without = ids.filter((id) => id !== productId);
  return favorite ? [...without, productId] : without;
}

let inflight: Promise<void> | null = null;

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  status: "idle",
  signedIn: false,
  ids: [],

  load: async () => {
    if (typeof document === "undefined") return;
    const signedIn = hasAuthCookie(document.cookie);
    const { status, signedIn: loadedAs } = get();

    // Already loaded for this same situation (or loading right now): nothing to do.
    if (status === "loading" && inflight) return inflight;
    if (status === "ready" && loadedAs === signedIn) return;

    if (!signedIn) {
      set({ status: "ready", signedIn: false, ids: [] });
      return;
    }

    set({ status: "loading", signedIn: true });
    inflight = (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          set({ status: "ready", signedIn: false, ids: [] });
          return;
        }
        const { data } = await supabase.from("wishlists").select("product_id").eq("user_id", user.id);
        set({ status: "ready", signedIn: true, ids: (data ?? []).map((row) => row.product_id) });
      } catch {
        // The hearts simply show as empty; toggling still works and re-checks the session.
        set({ status: "ready", signedIn: true, ids: [] });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  },

  setFavorite: (productId, favorite) => set((state) => ({ ids: withFavorite(state.ids, productId, favorite) })),

  reset: () => {
    inflight = null;
    set({ status: "idle", signedIn: false, ids: [] });
  },
}));
