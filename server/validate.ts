import { MAX_AMOUNT } from '../shared/catalog.ts';

export class ValidationError extends Error {
  status = 400;
}

export type FieldSpec =
  | { type: 'string'; label: string; required?: boolean; max: number }
  | { type: 'text'; label: string; max: number }
  | { type: 'money'; label: string; allowNegative?: boolean }
  | { type: 'date'; label: string; required?: boolean }
  | { type: 'enum'; label: string; values: readonly string[]; default?: string };

export type Schema = Record<string, FieldSpec>;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Valida o corpo da requisição de acordo com o schema e devolve só os campos conhecidos. */
export function validate(schema: Schema, body: unknown): Record<string, string | number | null> {
  if (!body || typeof body !== 'object') throw new ValidationError('Dados inválidos.');
  const input = body as Record<string, unknown>;
  const out: Record<string, string | number | null> = {};

  for (const [key, spec] of Object.entries(schema)) {
    const raw = input[key];
    switch (spec.type) {
      case 'string': {
        const v = typeof raw === 'string' ? raw.trim() : '';
        if (spec.required && !v) throw new ValidationError(`Informe ${spec.label}.`);
        if (v.length > spec.max) throw new ValidationError(`${spec.label} pode ter no máximo ${spec.max} caracteres.`);
        out[key] = v;
        break;
      }
      case 'text': {
        const v = typeof raw === 'string' ? raw.trim() : '';
        if (v.length > spec.max) throw new ValidationError(`${spec.label} pode ter no máximo ${spec.max} caracteres.`);
        out[key] = v;
        break;
      }
      case 'money': {
        const v = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isInteger(v)) throw new ValidationError(`Informe um valor válido para ${spec.label}.`);
        if (!spec.allowNegative && v <= 0) throw new ValidationError(`${cap(spec.label)} precisa ser maior que zero.`);
        if (spec.allowNegative && v === 0) throw new ValidationError(`${cap(spec.label)} não pode ser zero.`);
        if (Math.abs(v) > MAX_AMOUNT) throw new ValidationError(`${cap(spec.label)} está acima do limite permitido.`);
        out[key] = v;
        break;
      }
      case 'date': {
        if (raw === undefined || raw === null || raw === '') {
          if (spec.required) throw new ValidationError(`Informe ${spec.label}.`);
          out[key] = null;
          break;
        }
        if (!isValidDate(raw)) throw new ValidationError(`${cap(spec.label)} é uma data inválida.`);
        out[key] = raw;
        break;
      }
      case 'enum': {
        const v = raw === undefined || raw === '' ? spec.default : raw;
        if (typeof v !== 'string' || !spec.values.includes(v)) {
          throw new ValidationError(`Escolha uma opção válida em ${spec.label}.`);
        }
        out[key] = v;
        break;
      }
    }
  }
  return out;
}
