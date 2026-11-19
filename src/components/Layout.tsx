import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, ShoppingBag, ReceiptText, Target, ChartPie, CalendarDays,
  UserRound, LogOut, Menu, X, Sparkles, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { billState } from '../lib/finance.ts';
import { today } from '../lib/dates.ts';
import { Bow, Heart } from './Kitty.tsx';
import { cx } from './ui.tsx';

interface NavItem { to: string; label: string; icon: LucideIcon }

const NAV: NavItem[] = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/receitas', label: 'Receitas', icon: TrendingUp },
  { to: '/despesas', label: 'Despesas', icon: ShoppingBag },
  { to: '/contas', label: 'Contas a pagar', icon: ReceiptText },
  { to: '/metas', label: 'Metas', icon: Target },
  { to: '/relatorios', label: 'Relatórios', icon: ChartPie },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/perfil', label: 'Perfil e ajustes', icon: UserRound },
];
const MOBILE_MAIN = ['/', '/despesas', '/contas', '/metas'];

export function Avatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const { user } = useAuth();
  const sizes = { sm: 'size-9 text-sm', md: 'size-11 text-base', lg: 'size-24 text-3xl' };
  if (user?.avatar) {
    return <img src={user.avatar} alt="" className={cx('rounded-full object-cover ring-2 ring-brand-100', sizes[size])} />;
  }
  return (
    <span className={cx('flex items-center justify-center rounded-full bg-brand-100 font-display font-bold text-brand-600 ring-2 ring-brand-50', sizes[size])}>
      {user?.name.trim().charAt(0).toUpperCase() ?? '?'}
    </span>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative flex size-10 items-center justify-center rounded-2xl bg-brand-500 shadow-[0_8px_18px_-8px_var(--brand-500)]">
        <Bow className="w-7" color="#fff" />
      </span>
      <div className="leading-tight">
        <p className="font-display text-lg font-bold text-ink">Kitty Finance</p>
        <p className="text-[11px] font-semibold text-muted">suas finanças com carinho</p>
      </div>
    </div>
  );
}

function useBillAlerts() {
  const { data, ready } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const days = user?.settings.notifications.daysBefore ?? 3;

  const counts = useMemo(() => {
    let overdue = 0;
    let soon = 0;
    for (const b of data.bills) {
      const s = billState(b, days);
      if (s === 'atrasada') overdue++;
      if (s === 'vence-logo') soon++;
    }
    return { overdue, soon };
  }, [data.bills, days]);

  useEffect(() => {
    if (!ready || !user) return;
    const n = user.settings.notifications;
    const parts = [];
    if (counts.overdue) parts.push(`${counts.overdue} conta${counts.overdue > 1 ? 's' : ''} atrasada${counts.overdue > 1 ? 's' : ''}`);
    if (counts.soon) parts.push(`${counts.soon} vencendo em breve`);
    if (!parts.length) return;
    const msg = `Atenção: ${parts.join(' e ')}.`;

    const key = `kf-alerted-${user.id}`;
    let last = '';
    try { last = sessionStorage.getItem(key) ?? ''; } catch { /* */ }
    if (n.inApp && last !== today()) {
      toast.info(msg);
      try { sessionStorage.setItem(key, today()); } catch { /* */ }
    }

    if (n.browser && 'Notification' in window && Notification.permission === 'granted') {
      const bkey = `kf-notified-${user.id}`;
      let lastB = '';
      try { lastB = localStorage.getItem(bkey) ?? ''; } catch { /* */ }
      if (lastB !== today()) {
        new Notification('Kitty Finance', { body: msg, icon: '/favicon.svg' });
        try { localStorage.setItem(bkey, today()); } catch { /* */ }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, counts.overdue, counts.soon]);

  return counts;
}

export function Layout() {
  const { user, logout } = useAuth();
  const { error, reload } = useData();
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const alerts = useBillAlerts();
  const decorations = user?.settings.decorations !== false;

  useEffect(() => {
    setMoreOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  const badgeFor = (to: string) => (to === '/contas' && alerts.overdue + alerts.soon > 0 ? alerts.overdue + alerts.soon : 0);

  const doLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className={cx('min-h-dvh', decorations && 'bg-hearts')}>
      {/* ----- menu lateral (computador) ----- */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-card/80 px-5 py-6 backdrop-blur lg:flex">
        <Logo />
        <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Menu principal">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx(
                  'group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-bold transition',
                  isActive ? 'bg-brand-500 text-white shadow-[0_10px_20px_-12px_var(--brand-500)]' : 'text-muted hover:bg-brand-50 hover:text-brand-600',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="size-[18px]" />
                  <span className="flex-1">{item.label}</span>
                  {badgeFor(item.to) > 0 && (
                    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-extrabold', isActive ? 'bg-white text-brand-600' : 'bg-cherry text-white')}>
                      {badgeFor(item.to)}
                    </span>
                  )}
                  {isActive && decorations && !badgeFor(item.to) && <Heart className="size-3.5 opacity-80" color="#fff" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {decorations && (
          <div className="relative mb-4 overflow-hidden rounded-3xl bg-brand-50 p-4">
            <Bow className="absolute -top-2 -right-3 w-16 rotate-12 opacity-30" />
            <p className="font-display text-sm font-bold text-brand-700">Dica do dia</p>
            <p className="mt-1 text-xs text-muted">Separe uma parte da renda logo que ela entrar. Pequenos valores fazem grandes metas ♥</p>
          </div>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-line p-2.5">
          <Avatar size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.isDemo ? 'Conta de demonstração' : user?.email}</p>
          </div>
          <button onClick={doLogout} className="rounded-full p-2 text-muted transition hover:bg-bad-soft hover:text-bad" aria-label="Sair" title="Sair">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      {/* ----- topo (celular/tablet) ----- */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-card/85 px-4 py-3 backdrop-blur lg:hidden">
        <Logo />
        <NavLink to="/perfil" aria-label="Perfil"><Avatar size="sm" /></NavLink>
      </header>

      <main className="px-4 pt-5 pb-28 sm:px-6 lg:ml-72 lg:px-10 lg:pt-8 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          {user?.isDemo && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm text-brand-700">
              <Sparkles className="size-4 shrink-0" />
              <p><strong>Conta de demonstração:</strong> os valores aqui são fictícios, só para você conhecer o sistema. Crie sua conta para começar do zero.</p>
            </div>
          )}
          {error && (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-bad/30 bg-bad-soft px-4 py-3 text-sm font-semibold text-bad">
              {error}
              <button onClick={() => void reload()} className="rounded-full bg-card px-3 py-1 text-xs font-bold">Tentar de novo</button>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* ----- navegação inferior (celular/tablet) ----- */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] backdrop-blur lg:hidden"
        aria-label="Navegação"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-between">
          {NAV.filter((n) => MOBILE_MAIN.includes(n.to)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cx('relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition', isActive ? 'text-brand-600' : 'text-muted')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('flex h-8 w-12 items-center justify-center rounded-full transition', isActive && 'bg-brand-100')}>
                    <item.icon className="size-5" />
                  </span>
                  {item.label === 'Contas a pagar' ? 'Contas' : item.label}
                  {badgeFor(item.to) > 0 && (
                    <span className="absolute top-0.5 right-[calc(50%-22px)] rounded-full bg-cherry px-1.5 text-[10px] font-extrabold text-white">{badgeFor(item.to)}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-bold text-muted"
            aria-expanded={moreOpen}
          >
            <span className="flex h-8 w-12 items-center justify-center rounded-full"><Menu className="size-5" /></span>
            Mais
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mais opções">
          <div className="absolute inset-0 bg-[#3b1a2a]/30" onClick={() => setMoreOpen(false)} />
          <div className="animate-pop-in absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-card px-5 pt-4 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display font-bold text-ink">Mais opções</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-full p-2 text-muted hover:bg-soft" aria-label="Fechar"><X className="size-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {NAV.filter((n) => !MOBILE_MAIN.includes(n.to)).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cx('flex flex-col items-center gap-2 rounded-2xl border p-4 text-center text-sm font-bold transition',
                      isActive ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-line text-ink hover:bg-soft')
                  }
                >
                  <item.icon className="size-5 text-brand-500" />
                  {item.label}
                </NavLink>
              ))}
            </div>
            <button onClick={doLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-bold text-bad transition hover:bg-bad-soft">
              <LogOut className="size-4" /> Sair da conta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
