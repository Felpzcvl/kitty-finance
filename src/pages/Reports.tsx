import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChartColumn, ChartPie, ChartSpline, Crown, Percent, Scale } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { BalanceChart, CategoryDonut, IncomeVsExpenseChart, SavingsRateChart } from '../components/charts.tsx';
import { Card, CardTitle, CategoryIcon, EmptyState, PageHeader, Segmented, Select, cx } from '../components/ui.tsx';
import { EXPENSE_CATEGORIES, EXPENSE_META } from '../lib/catalog.tsx';
import { monthlySeries, spendingByCategory, variation } from '../lib/finance.ts';
import { currentMonth, monthLabel, monthShort, shiftMonth } from '../lib/dates.ts';
import { money, percent } from '../lib/format.ts';

type Range = '3' | '6' | '12';

export function ReportsPage() {
  const { data } = useData();
  const [range, setRange] = useState<Range>('6');
  const [endMonth, setEndMonth] = useState(currentMonth());
  const count = Number(range);
  const startMonth = shiftMonth(endMonth, -(count - 1));

  const series = useMemo(() => monthlySeries(data, endMonth, count), [data, endMonth, count]);
  const byCategory = useMemo(() => spendingByCategory(data, startMonth, endMonth), [data, startMonth, endMonth]);

  const totals = useMemo(() => {
    const income = series.reduce((a, s) => a + s.receitas, 0);
    const spent = series.reduce((a, s) => a + s.despesas, 0);
    return { income, spent, rate: income ? ((income - spent) / income) * 100 : 0, avgSpent: spent / count };
  }, [series, count]);

  const top = byCategory[0];
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];

  const monthOptions = Array.from({ length: 24 }, (_, i) => shiftMonth(currentMonth(), -i));

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Entenda seus hábitos e acompanhe sua evolução"
        actions={
          <>
            <Segmented value={range} onChange={setRange} options={[{ value: '3', label: '3 meses' }, { value: '6', label: '6 meses' }, { value: '12', label: '12 meses' }]} />
            <Select value={endMonth} onChange={(e) => setEndMonth(e.target.value)} className="h-10 w-48" aria-label="Até o mês">
              {monthOptions.map((m) => <option key={m} value={m}>até {monthLabel(m)}</option>)}
            </Select>
          </>
        } />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">Receitas no período</p>
          <p className="tabular mt-1 font-display text-xl font-bold text-ok">{money(totals.income)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-bold text-muted">Despesas no período</p>
          <p className="tabular mt-1 font-display text-xl font-bold text-brand-600">{money(totals.spent)}</p>
          <p className="text-xs text-muted">média de {money(Math.round(totals.avgSpent))}/mês</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted"><Percent className="size-3.5" /> Percentual de economia</div>
          <p className={cx('tabular mt-1 font-display text-xl font-bold', totals.rate >= 0 ? 'text-ink' : 'text-bad')}>{percent(totals.rate, 1)}</p>
          <p className="text-xs text-muted">da renda não foi gasta</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted"><Crown className="size-3.5" /> Maior gasto</div>
          {top ? (
            <>
              <p className="mt-1 truncate font-display text-lg font-bold text-ink">{EXPENSE_CATEGORIES[top.category as keyof typeof EXPENSE_CATEGORIES]}</p>
              <p className="tabular text-xs text-muted">{money(top.amount)} · {percent(top.share)} do total</p>
            </>
          ) : <p className="mt-1 text-sm text-muted">Sem gastos</p>}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardTitle title="Receitas e despesas por mês" subtitle={`${monthShort(startMonth)} a ${monthShort(endMonth)}`} icon={ChartColumn} />
          <IncomeVsExpenseChart data={series} height={300} />
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle title="Gastos por categoria" subtitle="Despesas + contas pagas" icon={ChartPie} />
          {byCategory.length === 0 ? (
            <EmptyState icon={ChartPie} title="Sem gastos no período" />
          ) : (
            <>
              <CategoryDonut data={byCategory} height={210} />
              <ul className="mt-4 grid gap-2">
                {byCategory.map((c) => {
                  const meta = EXPENSE_META[c.category];
                  return (
                    <li key={c.category} className="flex items-center gap-3">
                      <CategoryIcon icon={meta.icon} color={meta.color} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between gap-2 text-sm">
                          <span className="truncate font-bold text-ink">{EXPENSE_CATEGORIES[c.category as keyof typeof EXPENSE_CATEGORIES]}</span>
                          <span className="tabular shrink-0 text-muted">{money(c.amount)}</span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full" style={{ width: `${c.share}%`, background: meta.color }} /></div>
                      </div>
                      <span className="tabular w-10 text-right text-xs font-bold text-muted">{percent(c.share)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        <Card className="xl:col-span-3">
          <CardTitle title="Evolução do saldo" subtitle="Saldo disponível ao fim de cada mês" icon={ChartSpline} />
          <BalanceChart data={series} height={260} />
        </Card>

        <Card className="xl:col-span-2">
          <CardTitle title="Percentual de economia" subtitle="Quanto da renda sobrou em cada mês" icon={Percent} />
          <SavingsRateChart data={series} height={260} />
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Comparação entre meses" subtitle={prev ? `${monthLabel(cur.month)} x ${monthLabel(prev.month)}` : undefined} icon={Scale} />
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs font-bold tracking-wide text-muted uppercase">
                  <th className="px-3 py-2">Mês</th><th className="px-3 py-2 text-right">Receitas</th><th className="px-3 py-2 text-right">Despesas</th>
                  <th className="px-3 py-2 text-right">Resultado</th><th className="px-3 py-2 text-right">Economia</th><th className="px-3 py-2 text-right">Despesas vs. mês anterior</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((s, i, arr) => {
                  const before = arr[i + 1];
                  const v = before ? variation(s.despesas, before.despesas) : null;
                  return (
                    <tr key={s.month} className="border-t border-line">
                      <td className="px-3 py-2.5 font-bold text-ink">{monthLabel(s.month)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-ok">{money(s.receitas)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-ink">{money(s.despesas)}</td>
                      <td className={cx('tabular px-3 py-2.5 text-right font-bold', s.resultado >= 0 ? 'text-ink' : 'text-bad')}>{money(s.resultado)}</td>
                      <td className="tabular px-3 py-2.5 text-right text-muted">{s.receitas ? percent(s.taxa, 1) : '—'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {v == null ? <span className="text-muted">—</span> : (
                          <span className={cx('inline-flex items-center gap-0.5 font-bold', v <= 0 ? 'text-ok' : 'text-bad')}>
                            {v <= 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}{percent(Math.abs(v), 1)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
