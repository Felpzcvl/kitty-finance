import type { Bill, BillState, FinanceData } from './types.ts';
import { daysBetween, lastDayOfMonth, monthOf, shiftMonth, today } from './dates.ts';

/*
 * Regras de cálculo (as mesmas em todo o app):
 * - Saldo disponível = receitas recebidas − despesas pagas − contas pagas − dinheiro guardado em metas
 *   (só conta o que tem data até o dia de referência).
 * - Despesas do mês = despesas lançadas no mês (pagas + pendentes) + contas pagas no mês.
 * - Total economizado = soma do que está guardado nas metas.
 */

const sum = (xs: { amount: number }[]) => xs.reduce((acc, x) => acc + x.amount, 0);

export function billState(bill: Bill, alertDays = 3, ref = today()): BillState {
  if (bill.status === 'pago') return 'paga';
  const diff = daysBetween(ref, bill.due_date);
  if (diff < 0) return 'atrasada';
  if (diff <= alertDays) return 'vence-logo';
  return 'pendente';
}

/** Saldo disponível considerando tudo até a data (inclusive). */
export function balanceAt(data: FinanceData, date = today()) {
  const income = sum(data.incomes.filter((i) => i.date <= date));
  const expenses = sum(data.expenses.filter((e) => e.status === 'pago' && e.date <= date));
  const bills = sum(data.bills.filter((b) => b.status === 'pago' && b.paid_at && b.paid_at <= date));
  const deposits = sum(data.deposits.filter((d) => d.date <= date));
  return income - expenses - bills - deposits;
}

export function monthSummary(data: FinanceData, month: string) {
  const incomes = data.incomes.filter((i) => monthOf(i.date) === month);
  const expenses = data.expenses.filter((e) => monthOf(e.date) === month);
  const billsPaid = data.bills.filter((b) => b.status === 'pago' && b.paid_at && monthOf(b.paid_at) === month);
  const billsDue = data.bills.filter((b) => monthOf(b.due_date) === month);
  const deposits = data.deposits.filter((d) => monthOf(d.date) === month);

  const income = sum(incomes);
  const expensesPaid = sum(expenses.filter((e) => e.status === 'pago'));
  const expensesPending = sum(expenses.filter((e) => e.status === 'pendente'));
  const billsPaidTotal = sum(billsPaid);
  const billsPending = sum(billsDue.filter((b) => b.status === 'pendente'));
  const spent = expensesPaid + expensesPending + billsPaidTotal;
  const saved = sum(deposits);
  const net = income - spent;
  return {
    income,
    spent,
    expensesPaid,
    expensesPending,
    billsPaid: billsPaidTotal,
    billsPending,
    saved,
    net,
    savingsRate: income > 0 ? ((income - spent) / income) * 100 : 0,
  };
}

export const totalSaved = (data: FinanceData) => data.goals.reduce((acc, g) => acc + g.saved, 0);

export function monthRange(endMonth: string, count: number) {
  return Array.from({ length: count }, (_, i) => shiftMonth(endMonth, i - count + 1));
}

/** Série mensal para gráficos. */
export function monthlySeries(data: FinanceData, endMonth: string, count: number) {
  return monthRange(endMonth, count).map((month) => {
    const s = monthSummary(data, month);
    const end = lastDayOfMonth(month);
    const ref = end < today() ? end : today();
    return {
      month,
      receitas: s.income,
      despesas: s.spent,
      economia: s.saved,
      resultado: s.net,
      taxa: s.savingsRate,
      saldo: month > today().slice(0, 7) ? null : balanceAt(data, ref),
    };
  });
}

/** Gastos por categoria num intervalo de meses [from, to]. */
export function spendingByCategory(data: FinanceData, fromMonth: string, toMonth: string) {
  const inRange = (d: string) => monthOf(d) >= fromMonth && monthOf(d) <= toMonth;
  const map = new Map<string, number>();
  for (const e of data.expenses) if (inRange(e.date)) map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  for (const b of data.bills) {
    if (b.status === 'pago' && b.paid_at && inRange(b.paid_at)) map.set(b.category, (map.get(b.category) ?? 0) + b.amount);
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount, share: total ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

export function upcomingBills(data: FinanceData, limit = 5) {
  return data.bills
    .filter((b) => b.status === 'pendente')
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, limit);
}

export const variation = (current: number, previous: number) =>
  previous === 0 ? (current === 0 ? 0 : null) : ((current - previous) / Math.abs(previous)) * 100;
