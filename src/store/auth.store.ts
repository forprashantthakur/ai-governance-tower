import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _hasHydrated: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      _hasHydrated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true, isLoading: false }),

      clearAuth: () => {
        // Clear the auth cookie used by Next.js middleware
        if (typeof document !== "undefined") {
          document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
        }
        set({ token: null, user: null, isAuthenticated: false });
      },

      setLoading: (isLoading) => set({ isLoading }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "ai-governance-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
