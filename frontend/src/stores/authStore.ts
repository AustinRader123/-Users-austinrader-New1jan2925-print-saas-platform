import { create } from 'zustand';
import { apiClient } from '../lib/api';
import { extractErrorMessage } from '../lib/errors';

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '='.repeat((4 - (payload.length % 4 || 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  tenantId?: string | null;
  permissions?: string[];
}

export interface AuthStore {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  register: async (email, password, name) => {
    set({ loading: true, error: null });
    try {
      const result = await apiClient.register(email, password, name);
      apiClient.setToken(result.token);
      localStorage.setItem('lastLoginEmail', String(email || '').trim().toLowerCase());
      set({ token: result.token, user: { id: result.userId, email, name, role: result.role } });
    } catch (error: any) {
      const message = extractErrorMessage(error) || 'Registration failed';
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const result = await apiClient.login(email, password);
      apiClient.setToken(result.token);
      localStorage.setItem('lastLoginEmail', String(email || '').trim().toLowerCase());
      set({ token: result.token, user: { id: result.userId, email, role: result.role } });
    } catch (error: any) {
      const message = extractErrorMessage(error) || 'Login failed';
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ loading: false });
    }
  },

  logout: () => {
    apiClient.clearToken();
    set({ user: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null });
      return;
    }

    try {
      set({ loading: true });
      apiClient.setToken(token);
      const user = await apiClient.getMe();
      set({ user, token });
    } catch (error: any) {
      const message = extractErrorMessage(error);
      if (String(message || '').toLowerCase().includes('tenantid required')) {
        const payload = decodeJwtPayload(token);
        if (payload?.userId && payload?.role) {
          set({
            token,
            user: {
              id: String(payload.userId),
              email: localStorage.getItem('lastLoginEmail') || 'user@local',
              role: String(payload.role),
            },
            error: message,
          });
          return;
        }
      }
      apiClient.clearToken();
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },
}));
