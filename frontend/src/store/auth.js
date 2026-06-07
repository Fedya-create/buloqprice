import { create } from 'zustand';
import api from '@/lib/api';

export const useAuthStore = create((set) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null,
  profile: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  loading: false,

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
