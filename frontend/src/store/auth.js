import { create } from 'zustand';
import api from '@/lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  token: null,
  loading: false,
  hydrated: false,

  // Call this in useEffect to hydrate from localStorage (avoids SSR mismatch)
  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    set({ token, user, hydrated: true });
  },

  login: async (email, password) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, profile: data.profile, token: data.token, loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  register: async (userData) => {
    set({ loading: true });
    try {
      const { data } = await api.post('/auth/register', userData);
      set({ loading: false });
      return data;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, profile: null, token: null });
    window.location.href = '/auth/login';
  },

  fetchProfile: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, profile: data.profile });
    } catch (err) {
      console.error('Fetch profile error:', err);
    }
  }
}));
