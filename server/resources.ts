import {
  BILL_STATUS, EXPENSE_CATEGORIES, EXPENSE_STATUS, GOAL_COLORS, GOAL_ICONS, INCOME_CATEGORIES,
  INCOME_METHODS, PAYMENT_METHODS, RECURRENCE,
} from '../shared/catalog.ts';
import type { Schema } from './validate.ts';

const keys = (o: object) => Object.keys(o);

export interface ResourceDef {
  table: string;
  schema: Schema;
  orderBy: string;
}

export const RESOURCES: Record<string, ResourceDef> = {
  incomes: {
    table: 'incomes',
    orderBy: 'date DESC, id DESC',
    schema: {
      description: { type: 'string', label: 'a descrição', required: true, max: 120 },
      amount: { type: 'money', label: 'o valor' },
      category: { type: 'enum', label: 'categoria', values: keys(INCOME_CATEGORIES) },
      date: { type: 'date', label: 'a data de recebimento', required: true },
      method: { type: 'enum', label: 'forma de recebimento', values: keys(INCOME_METHODS) },
      notes: { type: 'text', label: 'Observações', max: 500 },
    },
  },
  expenses: {
    table: 'expenses',
    orderBy: 'date DESC, id DESC',
    schema: {
      description: { type: 'string', label: 'a descrição', required: true, max: 120 },
      amount: { type: 'money', label: 'o valor' },
      category: { type: 'enum', label: 'categoria', values: keys(EXPENSE_CATEGORIES) },
      date: { type: 'date', label: 'a data', required: true },
      method: { type: 'enum', label: 'forma de pagamento', values: keys(PAYMENT_METHODS) },
      status: { type: 'enum', label: 'status', values: keys(EXPENSE_STATUS), default: 'pago' },
      notes: { type: 'text', label: 'Observações', max: 500 },
    },
  },
  bills: {
    table: 'bills',
    orderBy: 'due_date ASC, id ASC',
    schema: {
      name: { type: 'string', label: 'o nome da conta', required: true, max: 120 },
      amount: { type: 'money', label: 'o valor' },
      due_date: { type: 'date', label: 'a data de vencimento', required: true },
      category: { type: 'enum', label: 'categoria', values: keys(EXPENSE_CATEGORIES) },
      status: { type: 'enum', label: 'status', values: keys(BILL_STATUS), default: 'pendente' },
      paid_at: { type: 'date', label: 'a data de pagamento' },
      recurrence: { type: 'enum', label: 'repetição', values: keys(RECURRENCE), default: 'nenhuma' },
      notes: { type: 'text', label: 'Observações', max: 500 },
    },
  },
  goals: {
    table: 'goals',
    orderBy: 'id ASC',
    schema: {
      name: { type: 'string', label: 'o nome da meta', required: true, max: 80 },
      target: { type: 'money', label: 'o valor desejado' },
      deadline: { type: 'date', label: 'o prazo' },
      icon: { type: 'enum', label: 'ícone', values: GOAL_ICONS, default: 'heart' },
      color: { type: 'enum', label: 'cor', values: GOAL_COLORS, default: 'rosa' },
    },
  },
};

export const DEPOSIT_SCHEMA: Schema = {
  amount: { type: 'money', label: 'o valor', allowNegative: true },
  date: { type: 'date', label: 'a data', required: true },
  note: { type: 'text', label: 'Observação', max: 200 },
};
