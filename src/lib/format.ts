import type { Settings } from './types.ts';

let currency: Settings['currency'] = 'BRL';
const LOCALES: Record<Settings['currency'], string> = { BRL: 'pt-BR', USD: 'en-US', EUR: 'de-DE' };
let formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let compact = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 });

export function setCurrency(c: Settings['currency']) {
  if (c === currency) return;
  currency = c;
  formatter = new Intl.NumberFormat(LOCALES[c], { style: 'currency', currency: c });
  compact = new Intl.NumberFormat(LOCALES[c], { style: 'currency', currency: c, notation: 'compact', maximumFractionDigits: 1 });
}

export const currencySymbol = () => ({ BRL: 'R$', USD: 'US$', EUR: '€' })[currency];

/** Formata centavos como moeda. */
export const money = (cents: number) => formatter.format(cents / 100);
export const moneyCompact = (cents: number) => compact.format(cents / 100);

export const percent = (value: number, digits = 0) =>
  `${(Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', { maximumFractionDigits: digits, minimumFractionDigits: digits })}%`;

/** Converte "1.234,56" / "1234.56" / "50" em centavos. Retorna null se inválido. */
export function parseMoney(input: string): number | null {
  let s = input.trim().replace(/[^\d.,-]/g, '');
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1 && lastComma > -1) {
    s = s.replace(/,/g, '');
  } else if (lastDot > -1 && s.length - lastDot - 1 === 3 && s.split('.').length >= 2) {
    // "1.234" → milhar
    s = s.replace(/\./g, '');
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Centavos → texto para editar no input ("1234,56"). */
export const centsToInput = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
