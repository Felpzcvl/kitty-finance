import { useMemo, useState } from 'react';
import { CalendarDays, CircleCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { MonthPicker } from '../components/MonthPicker.tsx';
import { Button, Card, EmptyState, PageHeader, cx } from '../components/ui.tsx';
import { billState } from '../lib/finance.ts';
import { WEEKDAYS_SHORT, formatDate, parseISO, today } from '../lib/dates.ts';
import { money } from '../lib/format.ts';

type Kind = 'receita' | 'despesa' | 'despesa-pendente' | 'conta-paga' | 'conta-pendente' | 'conta-atrasada' | 'meta';

const KIND: Record<Kind, { label: string; color: string }> = {
  receita: { label: 'Recebimento', color: 'var(--ok)' },
  despesa: { label: 'Despesa paga', color: 'var(--brand-500)' },
  'despesa-pendente': { label: 'Despesa pendente', color: '#c79bd8' },
  'conta-paga': { label: 'Conta paga', color: 'var(--info)' },
  'conta-pendente': { label: 'Conta a vencer', color: 'var(--warn)' },
  'conta-atrasada': { label: 'Conta atrasada', color: 'var(--bad)' },
  meta: { label: 'Prazo de meta', color: '#9a64e4' },
};

interface CalEvent { id: string; date: string; kind: Kind; title: string; amount: number | null; billId?: number }

export function CalendarPage() {
  const { user } = useAuth();
  const { data, month, payBill } = useData();
  const toast = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const alertDays = user?.settings.notifications.daysBefore ?? 3;

  const events = useMemo(() => {
    const list: CalEvent[] = [];
    const inMonth = (d: string | null) => !!d && d.startsWith(month);
    data.incomes.forEach((i) => inMonth(i.date) && list.push({ id: `i${i.id}`, date: i.date, kind: 'receita', title: i.description, amount: i.amount }));
    data.expenses.forEach((e) => inMonth(e.date) && list.push({ id: `e${e.id}`, date: e.date, kind: e.status === 'pago' ? 'despesa' : 'despesa-pendente', title: e.description, amount: e.amount }));
    data.bills.forEach((b) => {
      const st = billState(b, alertDays);
      if (b.status === 'pago') {
        const d = b.paid_at ?? b.due_date;
        if (inMonth(d)) list.push({ id: `b${b.id}`, date: d, kind: 'conta-paga', title: b.name, amount: b.amount });
      } else if (inMonth(b.due_date)) {
        list.push({ id: `b${b.id}`, date: b.due_date, kind: st === 'atrasada' ? 'conta-atrasada' : 'conta-pendente', title: b.name, amount: b.amount, billId: b.id });
      }
    });
    data.goals.forEach((g) => inMonth(g.deadline) && list.push({ id: `g${g.id}`, date: g.deadline!, kind: 'meta', title: `Meta: ${g.name}`, amount: null }));
    const map = new Map<string, CalEvent[]>();
    list.forEach((ev) => map.set(ev.date, [...(map.get(ev.date) ?? []), ev]));
    return map;
  }, [data, month, alertDays]);

  const cells = useMemo(() => {
    const first = parseISO(`${month}-01`);
    const start = first.getDay();
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const arr: (string | null)[] = Array(start).fill(null);
    for (let d = 1; d <= days; d++) arr.push(`${month}-${String(d).padStart(2, '0')}`);
    while (arr.length % 7) arr.push(null);
    return arr;
  }, [month]);

  const selEvents = selected ? events.get(selected) ?? [] : [];
  const monthTotals = useMemo(() => {
    let inc = 0, out = 0, upcoming = 0;
    events.forEach((evs) => evs.forEach((e) => {
      if (e.kind === 'receita') inc += e.amount ?? 0;
      else if (e.kind === 'despesa' || e.kind === 'conta-paga') out += e.amount ?? 0;
      else if (e.kind !== 'meta') upcoming += e.amount ?? 0;
    }));
    return { inc, out, upcoming };
  }, [events]);

  const pay = async (id: number, title: string) => {
    try {
      await payBill(id);
      toast.success(`"${title}" marcada como paga ♥`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Calendário financeiro" subtitle="Recebimentos, vencimentos e compromissos do mês" actions={<MonthPicker />} />

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(KIND).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 text-xs font-bold text-muted">
            <span className="size-2.5 rounded-full" style={{ background: v.color }} /> {v.label}
          </span>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Card className="p-3 sm:p-5">
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {WEEKDAYS_SHORT.map((w) => <p key={w} className="pb-1 text-center text-xs font-bold text-muted uppercase">{w}</p>)}
            {cells.map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const evs = events.get(date) ?? [];
              const isToday = date === today();
              const isSel = date === selected;
              return (
                <button
                  key={date}
                  onClick={() => setSelected(date)}
                  className={cx(
                    'flex min-h-14 flex-col items-stretch rounded-2xl border p-1 text-left transition sm:min-h-24 sm:p-2',
                    isSel ? 'border-brand-400 bg-brand-50' : 'border-line hover:border-brand-200 hover:bg-soft',
                  )}
                  aria-label={`${formatDate(date)}: ${evs.length} ${evs.length === 1 ? 'evento' : 'eventos'}`}
                >
                  <span className={cx('flex size-6 items-center justify-center self-center rounded-full text-xs font-bold sm:self-start sm:text-sm',
                    isToday ? 'bg-brand-500 text-white' : 'text-ink')}>
                    {Number(date.slice(8))}
                  </span>
                  {/* celular: pontinhos */}
                  <span className="mt-1 flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {evs.slice(0, 4).map((e) => <span key={e.id} className="size-1.5 rounded-full" style={{ background: KIND[e.kind].color }} />)}
                  </span>
                  {/* telas maiores: etiquetas */}
                  <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                    {evs.slice(0, 2).map((e) => (
                      <span key={e.id} className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: `color-mix(in oklab, ${KIND[e.kind].color} 15%, transparent)`, color: KIND[e.kind].color }}>
                        {e.title}
                      </span>
                    ))}
                    {evs.length > 2 && <span className="px-1 text-[10px] font-bold text-muted">+{evs.length - 2}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <p className="mb-3 font-display font-bold text-ink">{selected ? formatDate(selected) : 'Escolha um dia'}</p>
            {!selected ? (
              <p className="text-sm text-muted">Toque em um dia do calendário para ver os detalhes.</p>
            ) : selEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Dia livre" text="Nenhum movimento ou compromisso." />
            ) : (
              <ul className="grid gap-2">
                {selEvents.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
                    <span className="h-9 w-1.5 rounded-full" style={{ background: KIND[e.kind].color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink">{e.title}</p>
                      <p className="text-xs font-semibold" style={{ color: KIND[e.kind].color }}>{KIND[e.kind].label}</p>
                    </div>
                    {e.amount != null && <p className="tabular text-sm font-bold text-ink">{money(e.amount)}</p>}
                    {e.billId && (
                      <Button size="sm" variant="soft" icon={CircleCheck} onClick={() => pay(e.billId!, e.title)} aria-label="Marcar como paga">Pagar</Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <p className="mb-3 font-display font-bold text-ink">Resumo do mês</p>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Recebido / a receber</dt><dd className="tabular font-bold text-ok">{money(monthTotals.inc)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Já pago</dt><dd className="tabular font-bold text-ink">{money(monthTotals.out)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ainda a pagar</dt><dd className="tabular font-bold text-warn">{money(monthTotals.upcoming)}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
