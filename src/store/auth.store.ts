import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/types";

/**
 * Who is signed in, for the UI. The session token itself is never stored
 * here: it lives in an HttpOnly cookie that page scripts cannot read, and the
 * browser sends it with every same-origin request.
 */
interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  setAuth: (user: AuthUser) => void;
  /** Ends the session on the server (removes the HttpOnly cookie) and clears local state. */
  clearAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setAuth: (user) => set({ user, isAuthenticated: true, isLoading: false }),

      clearAuth: async () => {
        set({ user: null, isAuthenticated: false });
        if (typeof window === "undefined") return;
        // The session cookie is HttpOnly, so only the server can remove it.
        // Wait for it (one retry) so the page never looks signed out while the
        // cookie is still valid.
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch("/api/auth/logout", { method: "POST", keepalive: true });
            if (res.ok) return;
          } catch {
            // retry once
          }
        }
        console.warn("[auth] Sign-out request failed; the session cookie may still be set.");
      },

      setLoading: (isLoading) => set({ isLoading }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "ai-governance-auth",
      storage: createJSONStorage(() => localStorage),
      // Only non-secret display data is persisted.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
