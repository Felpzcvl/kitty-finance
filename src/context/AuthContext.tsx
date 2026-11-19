import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from '../lib/api.ts';
import { setCurrency } from '../lib/format.ts';
import type { Settings, User } from '../lib/types.ts';

interface AuthApi {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  enterDemo: () => Promise<void>;
  logout: () => void;
  updateProfile: (patch: { name?: string; avatar?: string | null; settings?: Settings }) => Promise<void>;
}

const Ctx = createContext<AuthApi | null>(null);

function applyAppearance(s: Settings) {
  const root = document.documentElement;
  const dark = s.theme === 'dark' || (s.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  root.classList.toggle('dark', dark);
  root.dataset.accent = s.accent;
  setCurrency(s.currency);
  try {
    localStorage.setItem('kf-theme', s.theme);
    localStorage.setItem('kf-accent', s.accent);
  } catch { /* sem storage */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const accept = useCallback((u: User, token?: string) => {
    if (token) tokenStore.set(token);
    applyAppearance(u.settings);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api<User>('/me')
      .then((u) => accept(u))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, [accept, logout]);

  // acompanha o tema do sistema quando a opção "sistema" está ativa
  useEffect(() => {
    if (user?.settings.theme !== 'system') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const fn = () => applyAppearance(user.settings);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, [user]);

  const value: AuthApi = {
    user,
    loading,
    logout,
    login: async (email, password) => {
      const r = await api<{ token: string; user: User }>('/auth/login', { method: 'POST', body: { email, password } });
      accept(r.user, r.token);
    },
    register: async (name, email, password) => {
      const r = await api<{ token: string; user: User }>('/auth/register', { method: 'POST', body: { name, email, password } });
      accept(r.user, r.token);
    },
    enterDemo: async () => {
      const r = await api<{ token: string; user: User }>('/auth/demo', { method: 'POST' });
      accept(r.user, r.token);
    },
    updateProfile: async (patch) => {
      const u = await api<User>('/me', { method: 'PUT', body: patch });
      accept(u);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth fora do AuthProvider');
  return ctx;
}
