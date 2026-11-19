import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X, type LucideIcon } from 'lucide-react';
import { currencySymbol } from '../lib/format.ts';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export { cx };

// ---------- Botões ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';

export function Button({
  variant = 'primary', size = 'md', icon: Icon, loading, className, children, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant; size?: 'sm' | 'md'; icon?: LucideIcon; loading?: boolean;
}) {
  const styles: Record<Variant, string> = {
    primary: 'bg-brand-500 text-white shadow-[0_8px_20px_-8px_var(--brand-500)] hover:bg-brand-600',
    secondary: 'border border-line bg-card text-ink hover:border-brand-200 hover:bg-brand-50',
    soft: 'bg-brand-50 text-brand-600 hover:bg-brand-100',
    ghost: 'text-muted hover:bg-soft hover:text-ink',
    danger: 'bg-bad text-white hover:brightness-95',
  };
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-full font-bold transition duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'h-9 px-3.5 text-sm' : 'h-11 px-5 text-sm',
        styles[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon && <Icon className="size-4" />}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon, label, tone = 'default', className, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; tone?: 'default' | 'danger' | 'ok' }) {
  const tones = {
    default: 'text-muted hover:bg-brand-50 hover:text-brand-600',
    danger: 'text-muted hover:bg-bad-soft hover:text-bad',
    ok: 'text-muted hover:bg-ok-soft hover:text-ok',
  };
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx('inline-flex size-9 items-center justify-center rounded-full transition active:scale-95', tones[tone], className)}
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

// ---------- Cartões e layout ----------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cx('rounded-3xl border border-line bg-card p-5 shadow-soft', className)}>{children}</section>;
}

export function CardTitle({ title, subtitle, action, icon: Icon }: {
  title: string; subtitle?: string; action?: ReactNode; icon?: LucideIcon;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex items-center gap-2.5">
        {Icon && (
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <Icon className="size-4" />
          </span>
        )}
        <div>
          <h2 className="font-display text-base font-bold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Badge({ tone = 'brand', children, className }: {
  tone?: 'brand' | 'ok' | 'warn' | 'bad' | 'info' | 'muted'; children: ReactNode; className?: string;
}) {
  const tones = {
    brand: 'bg-brand-50 text-brand-600',
    ok: 'bg-ok-soft text-ok',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    info: 'bg-info-soft text-info',
    muted: 'bg-soft text-muted',
  };
  return (
    <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold', tones[tone], className)}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, color, className }: { value: number; color?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cx('h-2.5 overflow-hidden rounded-full bg-soft', className)}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${v}%`, background: color ?? 'var(--brand-500)' }}
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }: {
  icon: LucideIcon; title: string; text?: string; action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <span className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-400">
        <Icon className="size-6" />
      </span>
      <p className="font-display font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string;
}) {
  return (
    <div className={cx('inline-flex rounded-full border border-line bg-card p-1', className)} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-full px-3.5 py-1.5 text-sm font-bold transition',
            value === o.value ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <label htmlFor={id} className="cursor-pointer">
        <span className="block text-sm font-bold text-ink">{label}</span>
        {description && <span className="block text-xs text-muted">{description}</span>}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', checked ? 'bg-brand-500' : 'bg-line')}
      >
        <span className={cx('absolute top-1 size-5 rounded-full bg-white shadow transition-all', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  );
}

// ---------- Formulários ----------

const inputBase =
  'w-full rounded-2xl border border-line bg-card px-4 text-sm text-ink placeholder:text-muted/70 transition focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100 aria-[invalid=true]:border-bad aria-[invalid=true]:ring-bad-soft';

export function Field({ label, error, hint, children, className }: {
  label: string; error?: string; hint?: string; children: (id: string) => ReactNode; className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">{label}</label>
      {children(id)}
      {error ? (
        <p className="mt-1 text-xs font-semibold text-bad">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...rest} aria-invalid={invalid || undefined} className={cx(inputBase, 'h-11', className)} />;
}

export function MoneyInput({ invalid, ...rest }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm font-bold text-muted">{currencySymbol()}</span>
      <input
        {...rest}
        inputMode="decimal"
        autoComplete="off"
        placeholder={rest.placeholder ?? '0,00'}
        aria-invalid={invalid || undefined}
        className={cx(inputBase, 'tabular h-11 pl-11 font-bold')}
      />
    </div>
  );
}

export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...rest} aria-invalid={invalid || undefined} className={cx(inputBase, 'h-11 cursor-pointer appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10', className)}
      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23b0809a' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(inputBase, 'min-h-20 resize-y py-3', className)} />;
}

export function Options({ map }: { map: Record<string, string> }) {
  return <>{Object.entries(map).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</>;
}

// ---------- Modal ----------

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg';
}) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => panel.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-[#3b1a2a]/30 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={panel}
        className={cx('animate-pop-in relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line bg-card shadow-2xl sm:rounded-3xl', widths[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
          </div>
          <IconButton icon={X} label="Fechar" onClick={onClose} className="-mr-2" />
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Confirmação ----------

interface ConfirmOptions { title: string; text?: string; confirmLabel?: string; danger?: boolean }
const ConfirmCtx = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOptions) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        title={state?.title ?? ''}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => close(false)}>Cancelar</Button>
            <Button variant={state?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>
              {state?.confirmLabel ?? 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">{state?.text}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error('useConfirm fora do ConfirmProvider');
  return ctx;
}

// ---------- Ícone de categoria ----------

export function CategoryIcon({ icon: Icon, color, size = 'md' }: { icon: LucideIcon; color: string; size?: 'sm' | 'md' }) {
  return (
    <span
      className={cx('flex shrink-0 items-center justify-center rounded-2xl', size === 'sm' ? 'size-8' : 'size-10')}
      style={{ background: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} />
    </span>
  );
}
