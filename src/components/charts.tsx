import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { money, moneyCompact, percent } from '../lib/format.ts';
import { monthShort } from '../lib/dates.ts';
import { EXPENSE_CATEGORIES, EXPENSE_META } from '../lib/catalog.tsx';

const axis = { stroke: 'var(--muted)', fontSize: 12, tickLine: false, axisLine: false } as const;
const INCOME = '#3fae8c';
const SPEND = 'var(--brand-500)';

type TooltipProps = { active?: boolean; payload?: { name: string; value: number; color?: string; payload?: Record<string, unknown> }[]; label?: string };

function ChartTooltip({ active, payload, label, format = money }: TooltipProps & { format?: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-card px-3.5 py-2.5 text-sm shadow-soft">
      {label && <p className="mb-1 font-bold capitalize text-ink">{/^\d{4}-\d{2}$/.test(label) ? monthShort(label) : label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted">
          <span className="size-2.5 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="tabular font-bold text-ink">{p.value === null ? '—' : format(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export interface MonthPoint {
  month: string;
  receitas: number;
  despesas: number;
  economia: number;
  resultado: number;
  taxa: number;
  saldo: number | null;
}

export function IncomeVsExpenseChart({ data, height = 260 }: { data: MonthPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={4} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
        <XAxis dataKey="month" tickFormatter={monthShort} {...axis} />
        <YAxis tickFormatter={(v) => moneyCompact(v)} width={64} {...axis} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--soft)', radius: 12 }} />
        <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 8 }} />
        <Bar name="Receitas" dataKey="receitas" fill={INCOME} radius={[8, 8, 2, 2]} maxBarSize={26} />
        <Bar name="Despesas" dataKey="despesas" fill={SPEND} radius={[8, 8, 2, 2]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BalanceChart({ data, height = 260 }: { data: MonthPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          <linearGradient id="kf-balance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-400)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--brand-400)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
        <XAxis dataKey="month" tickFormatter={monthShort} {...axis} />
        <YAxis tickFormatter={(v) => moneyCompact(v)} width={64} {...axis} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--brand-200)' }} />
        <Area name="Saldo" type="monotone" dataKey="saldo" stroke="var(--brand-500)" strokeWidth={3} fill="url(#kf-balance)"
          dot={{ r: 4, fill: 'var(--card)', stroke: 'var(--brand-500)', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SavingsRateChart({ data, height = 240 }: { data: MonthPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="4 4" />
        <XAxis dataKey="month" tickFormatter={monthShort} {...axis} />
        <YAxis tickFormatter={(v) => `${v}%`} width={52} {...axis} />
        <Tooltip content={<ChartTooltip format={(v) => percent(v, 1)} />} />
        <Line name="Economia" type="monotone" dataKey="taxa" stroke="#9a64e4" strokeWidth={3} dot={{ r: 4, fill: 'var(--card)', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryDonut({ data, height = 240 }: { data: { category: string; amount: number; share: number }[]; height?: number }) {
  const rows = data.map((d) => ({
    ...d,
    name: EXPENSE_CATEGORIES[d.category as keyof typeof EXPENSE_CATEGORIES] ?? d.category,
    color: EXPENSE_META[d.category]?.color ?? '#aaa',
  }));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={rows} dataKey="amount" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} cornerRadius={6} stroke="var(--card)" strokeWidth={2}>
            {rows.map((r) => <Cell key={r.category} fill={r.color} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs font-bold text-muted">Total</p>
        <p className="tabular font-display text-lg font-bold text-ink">{money(total)}</p>
      </div>
    </div>
  );
}
