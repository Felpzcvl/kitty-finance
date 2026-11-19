import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownRight, ArrowUpRight, Wallet, PiggyBank, ReceiptText, ShoppingBag, Plus, TrendingUp,
  ChartColumn, ChartSpline, Target, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { MonthPicker } from '../components/MonthPicker.tsx';
import { Badge, Button, Card, CardTitle, CategoryIcon, EmptyState, ProgressBar, cx } from '../components/ui.tsx';
import { BalanceChart, IncomeVsExpenseChart } from '../components/charts.tsx';
import { ExpenseForm, IncomeForm } from '../components/forms.tsx';
import { Bow, KittyMascot } from '../components/Kitty.tsx';
import { balanceAt, billState, monthSummary, monthlySeries, totalSaved, upcomingBills, variation } from '../lib/finance.ts';
import { currentMonth, formatDayMonth, greeting, lastDayOfMonth, monthLabel, monthOf, relativeDue, shiftMonth, today } from '../lib/dates.ts';
import { money, percent } from '../lib/format.ts';
import { EXPENSE_CATEGORIES, EXPENSE_META, GOAL_COLOR_MAP, GOAL_ICON_MAP } from '../lib/catalog.tsx';

function Stat({ label, value, icon: Icon, tone, hint, delta, invertDelta }: {
  label: string; value: number; icon: LucideIcon; tone: 'brand' | 'ok' | 'bad' | 'lilac'; hint?: string; delta?: number | null; invertDelta?: boolean;
}) {
  const tones = {
    brand: 'bg-brand-500 text-white',
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-bad-soft text-bad',
    lilac: 'bg-[#efe5ff] text-[#8249cc] dark:bg-[#2e2346] dark:text-[#c8a6fb]',
  };
  const good = delta == null ? null : invertDelta ? delta <= 0 : delta >= 0;
  return (
    <Card className="animate-fade-up flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-muted">{label}</p>
        <span className={cx('flex size-10 items-center justify-center rounded-2xl', tones[tone])}><Icon className="size-5" /></span>
      </div>
      <p className={cx('tabular font-display text-2xl font-bold tracking-tight sm:text-[26px]', value < 0 ? 'text-bad' : 'text-ink')}>{money(value)}</p>
      <div className="flex min-h-5 flex-wrap items-center gap-2 text-xs text-muted">
        {delta != null && (
          <span className={cx('inline-flex items-center gap-0.5 font-bold', good ? 'text-ok' : 'text-bad')}>
            {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {percent(Math.abs(delta))}
          </span>
        )}
        {hint}
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data, month, ready } = useData();
  const [form, setForm] = useState<'income' | 'expense' | null>(null);
  const alertDays = user?.settings.notifications.daysBefore ?? 3;

  const isCurrent = month === currentMonth();
  const refDate = isCurrent ? today() : lastDayOfMonth(month) < today() ? lastDayOfMonth(month) : today();
  const summary = useMemo(() => monthSummary(data, month), [data, month]);
  const prev = useMemo(() => monthSummary(data, shiftMonth(month, -1)), [data, month]);
  const balance = useMemo(() => balanceAt(data, refDate), [data, refDate]);
  const saved = totalSaved(data);
  const series = useMemo(() => monthlySeries(data, month, 6), [data, month]);
  const bills = useMemo(() => upcomingBills(data, 5), [data]);
  const recent = useMemo(
    () => data.expenses.filter((e) => monthOf(e.date) === month).slice(0, 6),
    [data.expenses, month],
  );
  const goals = data.goals.slice(0, 3);

  const firstName = user?.name.split(' ')[0] ?? '';
  const hasAny = data.incomes.length + data.expenses.length + data.bills.length + data.goals.length > 0;

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <KittyMascot className="w-24 animate-pulse" />
        <p className="font-display font-bold text-muted">Carregando suas finanças…</p>
      </div>
    );
  }

  return (
    <div>
      {/* boas-vindas */}
      <div className="relative mb-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-400 to-brand-600 p-6 text-white shadow-[0_20px_40px_-24px_var(--brand-600)] sm:p-8">
        {user?.settings.decorations !== false && (
          <>
            <Bow className="absolute -top-4 right-40 hidden w-24 -rotate-12 opacity-20 md:block" color="#fff" />
            <KittyMascot className="absolute -right-4 -bottom-10 hidden w-48 rotate-[-8deg] drop-shadow-xl sm:block" />
          </>
        )}
        <div className="relative max-w-xl sm:pr-36 xl:pr-0">
          <p className="text-sm font-bold text-white/80">{greeting()}, {firstName} ♥</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">
            {summary.net >= 0 ? 'Suas finanças estão no azul (ou melhor, no rosa)!' : 'Atenção: os gastos passaram das receitas neste mês.'}
          </h1>
          <p className="mt-2 text-sm text-white/85">
            Resultado de {monthLabel(month)}: <strong className="tabular">{money(summary.net)}</strong>
            {summary.income > 0 && <> · você economizou <strong>{percent(Math.max(0, summary.savingsRate))}</strong> da renda</>}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => setForm('income')} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-600 transition hover:scale-[1.03] active:scale-95">
              <Plus className="size-4" /> Receita
            </button>
            <button onClick={() => setForm('expense')} className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white ring-1 ring-white/40 transition hover:bg-white/30 active:scale-95">
              <Plus className="size-4" /> Despesa
            </button>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">Visão geral</h2>
        <MonthPicker />
      </div>

      {ready && !hasAny && (
        <Card className="mb-6">
          <EmptyState icon={Wallet} title="Tudo pronto para começar!" text="Cadastre sua primeira receita ou despesa. O saldo e os gráficos se atualizam sozinhos."
            action={<div className="flex gap-2"><Button icon={Plus} onClick={() => setForm('income')}>Adicionar receita</Button><Button variant="secondary" onClick={() => setForm('expense')}>Adicionar despesa</Button></div>} />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={isCurrent ? 'Saldo disponível' : 'Saldo no fim do mês'} value={balance} icon={Wallet} tone="brand" hint="receitas − gastos pagos − metas" />
        <Stat label="Receitas do mês" value={summary.income} icon={TrendingUp} tone="ok" delta={variation(summary.income, prev.income)} hint="vs. mês anterior" />
        <Stat label="Despesas do mês" value={summary.spent} icon={ShoppingBag} tone="bad" delta={variation(summary.spent, prev.spent)} invertDelta
          hint={summary.expensesPending ? `${money(summary.expensesPending)} pendente` : 'vs. mês anterior'} />
        <Stat label="Total economizado" value={saved} icon={PiggyBank} tone="lilac" hint={summary.saved ? `+${money(summary.saved)} neste mês` : 'guardado nas metas'} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardTitle title="Receitas x despesas" subtitle="Últimos 6 meses" icon={ChartColumn}
            action={<Link to="/relatorios" className="text-xs font-bold text-brand-600 hover:underline">Ver relatórios</Link>} />
          <IncomeVsExpenseChart data={series} />
        </Card>

        <Card>
          <CardTitle title="Contas próximas" subtitle="Pendentes por vencimento" icon={ReceiptText}
            action={<Link to="/contas" className="text-xs font-bold text-brand-600 hover:underline">Ver todas</Link>} />
          {bills.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Nenhuma conta pendente" text="Que tranquilidade! ♥" />
          ) : (
            <ul className="grid gap-2">
              {bills.map((b) => {
                const st = billState(b, alertDays);
                const meta = EXPENSE_META[b.category];
                return (
                  <li key={b.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-soft">
                    <CategoryIcon icon={meta.icon} color={meta.color} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{b.name}</p>
                      <p className={cx('text-xs font-semibold', st === 'atrasada' ? 'text-bad' : st === 'vence-logo' ? 'text-warn' : 'text-muted')}>
                        {formatDayMonth(b.due_date)} · {relativeDue(b.due_date)}
                      </p>
                    </div>
                    <p className="tabular text-sm font-bold text-ink">{money(b.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle title="Evolução financeira" subtitle="Saldo ao final de cada mês" icon={ChartSpline} />
          <BalanceChart data={series} />
        </Card>

        <Card>
          <CardTitle title="Despesas recentes" subtitle={monthLabel(month)} icon={ShoppingBag}
            action={<Link to="/despesas" className="text-xs font-bold text-brand-600 hover:underline">Ver todas</Link>} />
          {recent.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Sem despesas neste mês" />
          ) : (
            <ul className="grid gap-1">
              {recent.map((e) => {
                const meta = EXPENSE_META[e.category];
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-soft">
                    <CategoryIcon icon={meta.icon} color={meta.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{e.description}</p>
                      <p className="text-xs text-muted">{EXPENSE_CATEGORIES[e.category]} · {formatDayMonth(e.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="tabular text-sm font-bold text-ink">−{money(e.amount)}</p>
                      {e.status === 'pendente' && <Badge tone="warn">pendente</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {goals.length > 0 && (
        <Card className="mt-6">
          <CardTitle title="Suas metas" subtitle="Progresso dos objetivos" icon={Target}
            action={<Link to="/metas" className="inline-flex items-center text-xs font-bold text-brand-600 hover:underline">Ver metas <ChevronRight className="size-3.5" /></Link>} />
          <div className="grid gap-4 md:grid-cols-3">
            {goals.map((g) => {
              const pct = g.target ? (g.saved / g.target) * 100 : 0;
              const c = GOAL_COLOR_MAP[g.color];
              const I = GOAL_ICON_MAP[g.icon];
              return (
                <div key={g.id} className="rounded-2xl border border-line p-4">
                  <div className="mb-3 flex items-center gap-3">
                    <CategoryIcon icon={I} color={c.bar} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{g.name}</p>
                      <p className="tabular text-xs text-muted">{money(g.saved)} de {money(g.target)}</p>
                    </div>
                    <p className="font-display text-sm font-bold" style={{ color: c.bar }}>{percent(Math.min(100, pct))}</p>
                  </div>
                  <ProgressBar value={pct} color={c.bar} />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <IncomeForm open={form === 'income'} onClose={() => setForm(null)} />
      <ExpenseForm open={form === 'expense'} onClose={() => setForm(null)} />
    </div>
  );
}
