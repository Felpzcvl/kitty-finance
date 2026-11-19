import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, Info, X } from 'lucide-react';

type Kind = 'success' | 'error' | 'info';
interface Toast { id: number; kind: Kind; message: string }

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const push = useCallback((kind: Kind, message: string) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 5000 : 3200);
  }, [dismiss]);

  const api = useRef<ToastApi>({
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }).current;

  const icon = { success: CheckCircle2, error: CircleAlert, info: Info };
  const tone = {
    success: 'text-ok',
    error: 'text-bad',
    info: 'text-brand-500',
  };

  return (
    <Ctx.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6"
      >
        {toasts.map((t) => {
          const Icon = icon[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              className="animate-slide-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-sm shadow-soft"
            >
              <Icon className={`mt-0.5 size-5 shrink-0 ${tone[t.kind]}`} />
              <p className="flex-1 font-semibold text-ink">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="rounded-full p-0.5 text-muted transition hover:bg-soft hover:text-ink"
                aria-label="Fechar aviso"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast fora do ToastProvider');
  return ctx;
}
