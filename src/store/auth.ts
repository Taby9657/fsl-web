"use client";

import { create } from "zustand";
import { authApi, setUnauthorizedHandler } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/token";
import type { AuthUser } from "@/lib/types";

export type ActiveRole = "all" | "player" | "manager" | "referee" | "supervisor";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isGuest: boolean;
  loading: boolean;
  activeRole: ActiveRole;
  hydrated: boolean;

  setAuth: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  loginAsGuest: () => void;
  loadFromStorage: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setActiveRole: (role: ActiveRole) => void;
}

const GUEST_KEY = "fsl_guest";

/**
 * Vyhození cache React Query při odhlášení – jinak by novému uživateli chvíli
 * svítila data toho předchozího, než se stihnou přenačíst.
 * Registruje se z Providers, aby store nemusel znát QueryClient.
 */
let clearQueryCache: (() => void) | null = null;
export function setQueryCacheCleaner(fn: () => void) {
  clearQueryCache = fn;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isGuest: false,
  loading: true,
  activeRole: "all",
  hydrated: false,

  setAuth: (token, user) => {
    setToken(token);
    try {
      window.localStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
    set({ token, user, isGuest: false, loading: false, hydrated: true });
  },

  logout: async () => {
    // Nejdřív uklidíme u sebe, teprve pak informujeme server. Když se čekalo na
    // odpověď, uživatel po kliknutí na Odhlásit ještě chvíli viděl svůj účet.
    clearToken();
    try {
      window.localStorage.removeItem(GUEST_KEY);
    } catch {
      /* ignore */
    }
    set({ token: null, user: null, isGuest: false, loading: false, hydrated: true });
    clearQueryCache?.();

    // Na pozadí, výsledek nás nezajímá – lokálně jsme odhlášení tak jako tak.
    void authApi.logout().catch(() => {
      /* offline odhlášení nesmí nic blokovat */
    });
  },

  loginAsGuest: () => {
    try {
      window.localStorage.setItem(GUEST_KEY, "1");
    } catch {
      /* ignore */
    }
    set({ token: null, user: null, isGuest: true, loading: false, hydrated: true });
  },

  loadFromStorage: async () => {
    if (get().hydrated) return;
    const token = getToken();
    if (!token) {
      let guest = false;
      try {
        guest = window.localStorage.getItem(GUEST_KEY) === "1";
      } catch {
        /* ignore */
      }
      set({ loading: false, isGuest: guest, hydrated: true });
      return;
    }
    set({ token });
    try {
      const res = await authApi.me();
      set({ user: res.data.user, loading: false, hydrated: true });
    } catch {
      clearToken();
      set({ token: null, user: null, loading: false, hydrated: true });
    }
  },

  refreshUser: async () => {
    if (!get().token) return;
    try {
      const res = await authApi.me();
      set({ user: res.data.user });
    } catch {
      /* ignore */
    }
  },

  setActiveRole: (activeRole) => set({ activeRole }),
}));

// 401 z API vrstvy → tvrdé odhlášení
setUnauthorizedHandler(() => {
  useAuthStore.setState({
    token: null,
    user: null,
    isGuest: false,
    loading: false,
    hydrated: true,
  });
  clearQueryCache?.();
});

/* ---------- odvozené role ---------- */

export const useIsManager = () =>
  useAuthStore((s) => (s.user?.manager?.length ?? 0) > 0);

export const useIsReferee = () => useAuthStore((s) => !!s.user?.referee);

export const useIsPlayer = () => useAuthStore((s) => !!s.user?.player);

/**
 * Backend posílá `isSupervisor` v kořeni uživatele (`sanitizeUser`), protože
 * roli lze udělit i přes SUPERVISOR_USER_IDS, tedy bez hráčského profilu.
 * Web se díval jen do `player`, takže supervisora bez profilu neviděl.
 */
export const useIsSupervisor = () =>
  useAuthStore(
    (s) => s.user?.isSupervisor === true || s.user?.player?.isSupervisor === true,
  );

export const useMyTeamId = () =>
  useAuthStore((s) => s.user?.manager?.[0]?.teamId ?? s.user?.player?.teamId ?? null);

export const useHasAnyRole = () =>
  useAuthStore(
    (s) =>
      !!s.user &&
      (!!s.user.player || !!s.user.referee || (s.user.manager?.length ?? 0) > 0),
  );
