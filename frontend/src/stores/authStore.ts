import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
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
      set({ token: result.token, user: { id: result.userId, email, name, role: result.role } });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Registration failed' });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const result = await apiClient.login(email, password);
      apiClient.setToken(result.token);
      set({ token: result.token, user: { id: result.userId, email, role: result.role } });
    } catch (error: any) {
      set({ error: error.response?.data?.error || 'Login failed' });
      throw error;
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
    } catch (error) {
      apiClient.clearToken();
      set({ user: null, token: null });
    } finally {
      set({ loading: false });
    }
  },
}));
