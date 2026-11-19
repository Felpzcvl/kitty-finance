import { useMemo, useState } from 'react';
import { AlarmClock, CircleAlert, CircleCheck, Pencil, Plus, ReceiptText, Repeat, Trash2, Undo2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { BillForm } from '../components/forms.tsx';
import { Badge, Button, Card, CategoryIcon, EmptyState, IconButton, Input, PageHeader, Segmented, cx, useConfirm } from '../components/ui.tsx';
import { EXPENSE_CATEGORIES, EXPENSE_META } from '../lib/catalog.tsx';
import { billState } from '../lib/finance.ts';
import { formatDate, monthOf, relativeDue, currentMonth } from '../lib/dates.ts';
import { money } from '../lib/format.ts';
import type { Bill, BillState } from '../lib/types.ts';

const STATE_UI: Record<BillState, { label: string; tone: 'ok' | 'bad' | 'warn' | 'muted' }> = {
  paga: { label: 'Paga', tone: 'ok' },
  atrasada: { label: 'Atrasada', tone: 'bad' },
  'vence-logo': { label: 'Vence logo', tone: 'warn' },
  pendente: { label: 'Pendente', tone: 'muted' },
};

export function BillsPage() {
  const { user } = useAuth();
  const { data, payBill, unpayBill, remove } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const alertDays = user?.settings.notifications.daysBefore ?? 3;
  const [tab, setTab] = useState<'abertas' | 'pagas' | 'todas'>('abertas');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Bill | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const enriched = useMemo(() => data.bills.map((b) => ({ ...b, state: billState(b, alertDays) })), [data.bills, alertDays]);

  const stats = useMemo(() => {
    const m = currentMonth();
    const sumOf = (xs: typeof enriched) => xs.reduce((a, b) => a + b.amount, 0);
    const overdue = enriched.filter((b) => b.state === 'atrasada');
    const soon = enriched.filter((b) => b.state === 'vence-logo');
    const monthPending = enriched.filter((b) => b.status === 'pendente' && monthOf(b.due_date) === m);
    const monthPaid = enriched.filter((b) => b.status === 'pago' && b.paid_at && monthOf(b.paid_at) === m);
    return {
      overdue: { n: overdue.length, v: sumOf(overdue) },
      soon: { n: soon.length, v: sumOf(soon) },
      pending: { n: monthPending.length, v: sumOf(monthPending) },
      paid: { n: monthPaid.length, v: sumOf(monthPaid) },
    };
  }, [enriched]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = enriched.filter((b) => !q || b.name.toLowerCase().includes(q));
    if (tab === 'abertas') list = list.filter((b) => b.status === 'pendente');
    if (tab === 'pagas') list = list.filter((b) => b.status === 'pago').sort((a, b) => (b.paid_at ?? '').localeCompare(a.paid_at ?? ''));
    if (tab === 'todas') list = [...list].sort((a, b) => b.due_date.localeCompare(a.due_date));
    return list;
  }, [enriched, tab, query]);

  const pay = async (b: Bill) => {
    setBusy(b.id);
    try {
      const { next } = await payBill(b.id);
      toast.success(next ? `"${b.name}" paga! A do próximo mês já foi agendada.` : `"${b.name}" marcada como paga ♥`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const unpay = async (b: Bill) => {
    setBusy(b.id);
    try {
      await unpayBill(b.id);
      toast.info(`"${b.name}" voltou para pendente.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const del = async (b: Bill) => {
    const ok = await confirm({ title: 'Excluir conta?', text: `"${b.name}" (${money(b.amount)}) será excluída permanentemente.`, confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    try {
      await remove('bills', b.id);
      toast.success('Conta excluída.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openNew = () => { setEditing(null); setOpen(true); };

  const summary = [
    { label: 'Atrasadas', icon: CircleAlert, ...stats.overdue, cls: 'bg-bad-soft text-bad' },
    { label: `Vencem em até ${alertDays} dias`, icon: AlarmClock, ...stats.soon, cls: 'bg-warn-soft text-warn' },
    { label: 'A pagar neste mês', icon: ReceiptText, ...stats.pending, cls: 'bg-brand-50 text-brand-600' },
    { label: 'Pagas neste mês', icon: CircleCheck, ...stats.paid, cls: 'bg-ok-soft text-ok' },
  ];

  return (
    <div>
      <PageHeader title="Contas a pagar" subtitle="Nada de esquecer vencimento" actions={<Button icon={Plus} onClick={openNew}>Nova conta</Button>} />

      {stats.overdue.n > 0 && (
        <div className="animate-fade-up mb-5 flex items-center gap-3 rounded-2xl border border-bad/25 bg-bad-soft px-4 py-3 text-sm text-bad" role="alert">
          <CircleAlert className="size-5 shrink-0" />
          <p><strong>{stats.overdue.n} conta{stats.overdue.n > 1 ? 's' : ''} atrasada{stats.overdue.n > 1 ? 's' : ''}</strong> somando {money(stats.overdue.v)}. Que tal resolver hoje?</p>
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2">
              <span className={cx('flex size-8 items-center justify-center rounded-xl', s.cls)}><s.icon className="size-4" /></span>
              <p className="text-xs leading-tight font-bold text-muted">{s.label}</p>
            </div>
            <p className="tabular mt-2 font-display text-xl font-bold text-ink">{money(s.v)}</p>
            <p className="text-xs text-muted">{s.n} {s.n === 1 ? 'conta' : 'contas'}</p>
          </Card>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'abertas', label: 'Em aberto' }, { value: 'pagas', label: 'Pagas' }, { value: 'todas', label: 'Todas' }]} />
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conta…" className="h-10 pl-11" aria-label="Buscar conta" />
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={ReceiptText} title={tab === 'abertas' ? 'Nenhuma conta em aberto' : 'Nada por aqui'}
            text={tab === 'abertas' ? 'Cadastre aluguel, internet, faturas… e receba alertas antes do vencimento.' : undefined}
            action={tab === 'abertas' && <Button icon={Plus} onClick={openNew}>Adicionar conta</Button>} />
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((b) => {
            const meta = EXPENSE_META[b.category];
            const ui = STATE_UI[b.state];
            return (
              <Card key={b.id} className={cx('animate-fade-up flex flex-col gap-4 p-4', b.state === 'atrasada' && 'border-bad/40')}>
                <div className="flex items-start gap-3">
                  <CategoryIcon icon={meta.icon} color={meta.color} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-ink">{b.name}</p>
                    <p className="text-xs text-muted">{EXPENSE_CATEGORIES[b.category]}{b.recurrence === 'mensal' && <span className="ml-1 inline-flex items-center gap-0.5"><Repeat className="size-3" /> mensal</span>}</p>
                  </div>
                  <Badge tone={ui.tone}>{ui.label}</Badge>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="tabular font-display text-2xl font-bold text-ink">{money(b.amount)}</p>
                    <p className={cx('text-xs font-semibold', b.state === 'atrasada' ? 'text-bad' : b.state === 'vence-logo' ? 'text-warn' : 'text-muted')}>
                      {b.status === 'pago' ? `Paga em ${formatDate(b.paid_at ?? b.due_date)}` : `Vence ${formatDate(b.due_date)} · ${relativeDue(b.due_date)}`}
                    </p>
                  </div>
                  <div className="flex">
                    <IconButton icon={Pencil} label="Editar" onClick={() => { setEditing(b); setOpen(true); }} />
                    <IconButton icon={Trash2} tone="danger" label="Excluir" onClick={() => del(b)} />
                  </div>
                </div>
                {b.notes && <p className="-mt-2 text-xs text-muted">{b.notes}</p>}
                {b.status === 'pendente' ? (
                  <Button size="sm" icon={CircleCheck} loading={busy === b.id} onClick={() => pay(b)} className="w-full">Marcar como paga</Button>
                ) : (
                  <Button size="sm" variant="secondary" icon={Undo2} loading={busy === b.id} onClick={() => unpay(b)} className="w-full">Desfazer pagamento</Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <BillForm open={open} onClose={() => setOpen(false)} initial={editing} />
    </div>
  );
}
