import type { AuthProvider } from 'react-admin';
import axios from 'axios';

const API = '/auth';

export const authProvider: AuthProvider = {
  login: async ({ username, password }: { username: string; password: string }) => {
    const { data } = await axios.post(`${API}/login`, { email: username, password });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('manager', JSON.stringify(data.manager));
  },

  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('manager');
  },

  checkAuth: async () => {
    if (!localStorage.getItem('token')) {
      throw new Error('Not authenticated');
    }
  },

  checkError: async (error: any) => {
    const status = error?.status || error?.response?.status || error?.body?.statusCode;
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('manager');
      throw new Error('Session expired');
    }
    // 403 = forbidden (role-based), don't logout — user is authenticated but lacks permission
  },

  getIdentity: async () => {
    const raw = localStorage.getItem('manager');
    if (!raw) throw new Error('No identity');
    const manager = JSON.parse(raw);
    return { id: manager.id, fullName: manager.name || manager.email };
  },

  getPermissions: async () => {
    const raw = localStorage.getItem('manager');
    if (!raw) return null;
    return JSON.parse(raw).role;
  },
};
