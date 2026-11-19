const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());
export const currentMonth = () => today().slice(0, 7);

export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d || 1);
};

/** "2026-11" → soma n meses. */
export function shiftMonth(month: string, n: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export const monthOf = (date: string) => date.slice(0, 7);
export const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${pad(new Date(y, m, 0).getDate())}`;
};

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  const name = MONTHS[m - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
};
export const monthShort = (month: string) => {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]}/${String(y).slice(2)}`;
};

export const formatDate = (s: string) => {
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
};
export const formatDayMonth = (s: string) => {
  const [, m, d] = s.split('-').map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]}`;
};

/** Diferença em dias (b - a). */
export const daysBetween = (a: string, b: string) =>
  Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86_400_000);

export function relativeDue(due: string) {
  const diff = daysBetween(today(), due);
  if (diff === 0) return 'vence hoje';
  if (diff === 1) return 'vence amanhã';
  if (diff > 1) return `vence em ${diff} dias`;
  if (diff === -1) return 'venceu ontem';
  return `atrasada há ${-diff} dias`;
}

export const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};
