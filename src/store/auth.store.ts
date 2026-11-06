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
  clearAuth: () => void;
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

      clearAuth: () => {
        // The session cookie is HttpOnly, so ask the server to remove it.
        if (typeof window !== "undefined") {
          // keepalive lets the request finish even if the page navigates away.
          fetch("/api/auth/logout", { method: "POST", keepalive: true }).catch(() => undefined);
        }
        set({ user: null, isAuthenticated: false });
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
