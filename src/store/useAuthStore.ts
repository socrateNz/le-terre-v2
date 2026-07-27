import { create } from 'zustand';
import { IUser } from '@/types';

interface AuthState {
  user: IUser | null;
  balance: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: IUser | null) => void;
  setBalance: (balance: number) => void;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  balance: 0,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setBalance: (balance) => set({ balance }),
  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      set({ user: null, balance: 0, isAuthenticated: false });
    }
  },
  fetchCurrentUser: async () => {
    console.log('[AuthStore] Fetching current user...');
    set({ isLoading: true });
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch('/api/auth/me', { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.success) {
        console.log('[AuthStore] User authenticated successfully:', data.data.username);
        set({
          user: data.data,
          balance: data.data.balance || 0,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        console.warn('[AuthStore] Auth check returned unauthenticated status:', data.error);
        set({ user: null, balance: 0, isAuthenticated: false, isLoading: false });
      }
    } catch (err: any) {
      console.error('[AuthStore] Error fetching current user:', err?.message || err);
      set({ user: null, balance: 0, isAuthenticated: false, isLoading: false });
    }
  },
}));
