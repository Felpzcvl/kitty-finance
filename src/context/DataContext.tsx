import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../lib/api.ts';
import { currentMonth } from '../lib/dates.ts';
import type { Bill, Deposit, FinanceData, Goal } from '../lib/types.ts';

type Resource = 'incomes' | 'expenses' | 'bills' | 'goals';

interface DataApi {
  data: FinanceData;
  ready: boolean;
  error: string | null;
  month: string;
  setMonth: (m: string) => void;
  reload: () => Promise<void>;
  create: (resource: Resource, body: object) => Promise<void>;
  update: (resource: Resource, id: number, body: object) => Promise<void>;
  remove: (resource: Resource, id: number) => Promise<void>;
  payBill: (id: number, paidAt?: string) => Promise<{ next: Bill | null }>;
  unpayBill: (id: number) => Promise<void>;
  addDeposit: (goalId: number, body: { amount: number; date: string; note: string }) => Promise<void>;
  removeDeposit: (id: number) => Promise<void>;
}

const EMPTY: FinanceData = { incomes: [], expenses: [], bills: [], goals: [], deposits: [] };
const Ctx = createContext<DataApi | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<FinanceData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonth);

  const reload = useCallback(async () => {
    try {
      const d = await api<FinanceData>('/data');
      setData(d);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const value = useMemo<DataApi>(() => ({
    data,
    ready,
    error,
    month,
    setMonth,
    reload,
    create: async (resource, body) => {
      await api(`/${resource}`, { method: 'POST', body });
      await reload();
    },
    update: async (resource, id, body) => {
      await api(`/${resource}/${id}`, { method: 'PUT', body });
      await reload();
    },
    remove: async (resource, id) => {
      await api(`/${resource}/${id}`, { method: 'DELETE' });
      await reload();
    },
    payBill: async (id, paidAt) => {
      const r = await api<{ bill: Bill; next: Bill | null }>(`/bills/${id}/pay`, { method: 'POST', body: paidAt ? { paid_at: paidAt } : {} });
      await reload();
      return { next: r.next };
    },
    unpayBill: async (id) => {
      await api(`/bills/${id}/unpay`, { method: 'POST', body: {} });
      await reload();
    },
    addDeposit: async (goalId, body) => {
      await api<Deposit>(`/goals/${goalId}/deposits`, { method: 'POST', body });
      await reload();
    },
    removeDeposit: async (id) => {
      await api(`/goal-deposits/${id}`, { method: 'DELETE' });
      await reload();
    },
  }), [data, ready, error, month, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData fora do DataProvider');
  return ctx;
}

export type { Goal };
