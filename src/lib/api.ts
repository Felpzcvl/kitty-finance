const TOKEN_KEY = 'kf-token';

export const tokenStore = {
  get: () => {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set: (t: string) => {
    try { localStorage.setItem(TOKEN_KEY, t); } catch { /* sem storage */ }
  },
  clear: () => {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* sem storage */ }
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError('Não consegui falar com o servidor. Ele está rodando?', 0);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth')) onUnauthorized?.();
    throw new ApiError(data?.error ?? 'Algo deu errado. Tente novamente.', res.status);
  }
  return data as T;
}
