import type {
  ExpenseCategory, GoalColor, GoalIcon, IncomeCategory, IncomeMethod, PaymentMethod,
} from '../../shared/catalog.ts';

export interface Settings {
  currency: 'BRL' | 'USD' | 'EUR';
  theme: 'light' | 'dark' | 'system';
  accent: 'rosa' | 'morango' | 'lavanda';
  decorations: boolean;
  notifications: { inApp: boolean; browser: boolean; daysBefore: number };
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
  isDemo: boolean;
  createdAt: string;
  settings: Settings;
}

export interface Income {
  id: number;
  description: string;
  amount: number; // centavos
  category: IncomeCategory;
  date: string;
  method: IncomeMethod;
  notes: string;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  method: PaymentMethod;
  status: 'pago' | 'pendente';
  notes: string;
}

export interface Bill {
  id: number;
  name: string;
  amount: number;
  due_date: string;
  category: ExpenseCategory;
  status: 'pago' | 'pendente';
  paid_at: string | null;
  recurrence: 'nenhuma' | 'mensal';
  notes: string;
}

export interface Goal {
  id: number;
  name: string;
  target: number;
  saved: number;
  deadline: string | null;
  icon: GoalIcon;
  color: GoalColor;
}

export interface Deposit {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note: string;
}

export interface FinanceData {
  incomes: Income[];
  expenses: Expense[];
  bills: Bill[];
  goals: Goal[];
  deposits: Deposit[];
}

export type BillState = 'paga' | 'atrasada' | 'vence-logo' | 'pendente';
