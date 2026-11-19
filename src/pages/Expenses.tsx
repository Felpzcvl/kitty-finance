import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, ShoppingBag, Trash2, Undo2, FilterX } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { ExpenseForm } from '../components/forms.tsx';
import { usePeriod } from '../components/PeriodFilter.tsx';
import { Badge, Button, Card, CategoryIcon, EmptyState, IconButton, Input, Options, PageHeader, Select, useConfirm } from '../components/ui.tsx';
import { EXPENSE_CATEGORIES, EXPENSE_META, PAYMENT_METHODS } from '../lib/catalog.tsx';
import { formatDate } from '../lib/dates.ts';
import { money } from '../lib/format.ts';
import type { Expense } from '../lib/types.ts';

export function ExpensesPage() {
  const { data, update, remove } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const period = usePeriod();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.expenses.filter((e) =>
      period.inPeriod(e.date) &&
      (!category || e.category === category) &&
      (!status || e.status === status) &&
      (!method || e.method === method) &&
      (!q || e.description.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q)),
    );
  }, [data.expenses, period, query, category, status, method]);

  const total = rows.reduce((a, e) => a + e.amount, 0);
  const paid = rows.filter((e) => e.status === 'pago').reduce((a, e) => a + e.amount, 0);
  const filtersOn = !!(query || category || status || method);

  const toggleStatus = async (e: Expense) => {
    try {
      await update('expenses', e.id, { ...e, status: e.status === 'pago' ? 'pendente' : 'pago' });
      toast.success(e.status === 'pago' ? 'Marcada como pendente.' : 'Despesa marcada como paga ♥');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const del = async (e: Expense) => {
    const ok = await confirm({ title: 'Excluir despesa?', text: `"${e.description}" (${money(e.amount)}) será excluída permanentemente.`, confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    try {
      await remove('expenses', e.id);
      toast.success('Despesa excluída.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (e: Expense) => { setEditing(e); setOpen(true); };

  return (
    <div>
      <PageHeader title="Despesas" subtitle="Tudo o que saiu (ou vai sair) do seu bolso" actions={<Button icon={Plus} onClick={openNew}>Nova despesa</Button>} />

      <Card className="mb-5 grid gap-3">
        {period.ui}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_200px_160px_190px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar despesas…" className="pl-11" aria-label="Pesquisar" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option><Options map={EXPENSE_CATEGORIES} />
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">Todos os status</option><option value="pago">Pagas</option><option value="pendente">Pendentes</option>
          </Select>
          <Select value={method} onChange={(e) => setMethod(e.target.value)} aria-label="Forma de pagamento">
            <option value="">Todas as formas</option><Options map={PAYMENT_METHODS} />
          </Select>
          {filtersOn && (
            <Button variant="ghost" icon={FilterX} onClick={() => { setQuery(''); setCategory(''); setStatus(''); setMethod(''); }}>Limpar</Button>
          )}
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          ['Total no filtro', total, 'text-ink'],
          ['Pago', paid, 'text-ok'],
          ['Pendente', total - paid, 'text-warn'],
        ].map(([l, v, c]) => (
          <div key={l as string} className="rounded-2xl border border-line bg-card px-4 py-3">
            <p className="text-xs font-bold text-muted">{l}</p>
            <p className={`tabular font-display text-base font-bold sm:text-lg ${c}`}>{money(v as number)}</p>
          </div>
        ))}
      </div>

      <Card className="p-2 sm:p-3">
        {rows.length === 0 ? (
          <EmptyState icon={ShoppingBag} title={filtersOn ? 'Nada encontrado' : 'Nenhuma despesa neste período'}
            text={filtersOn ? 'Tente mudar os filtros.' : 'Registre seus gastos para acompanhar para onde vai o dinheiro.'}
            action={!filtersOn && <Button icon={Plus} onClick={openNew}>Adicionar despesa</Button>} />
        ) : (
          <>
            {/* tabela (telas maiores) */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold tracking-wide text-muted uppercase">
                    <th className="px-3 py-2">Descrição</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Pagamento</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Valor</th><th className="w-32" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => {
                    const meta = EXPENSE_META[e.category];
                    return (
                      <tr key={e.id} className="group border-t border-line transition hover:bg-soft/60">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-3">
                            <CategoryIcon icon={meta.icon} color={meta.color} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-bold text-ink">{e.description}</p>
                              {e.notes && <p className="max-w-64 truncate text-xs text-muted">{e.notes}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{EXPENSE_CATEGORIES[e.category]}</td>
                        <td className="tabular px-3 py-2.5 text-muted">{formatDate(e.date)}</td>
                        <td className="px-3 py-2.5 text-muted">{PAYMENT_METHODS[e.method]}</td>
                        <td className="px-3 py-2.5">{e.status === 'pago' ? <Badge tone="ok">Pago</Badge> : <Badge tone="warn">Pendente</Badge>}</td>
                        <td className="tabular px-3 py-2.5 text-right font-bold text-ink">{money(e.amount)}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex justify-end">
                            <IconButton icon={e.status === 'pago' ? Undo2 : Check} tone="ok" label={e.status === 'pago' ? 'Marcar como pendente' : 'Marcar como paga'} onClick={() => toggleStatus(e)} />
                            <IconButton icon={Pencil} label="Editar" onClick={() => openEdit(e)} />
                            <IconButton icon={Trash2} tone="danger" label="Excluir" onClick={() => del(e)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* lista (celular) */}
            <ul className="grid gap-1 xl:hidden">
              {rows.map((e) => {
                const meta = EXPENSE_META[e.category];
                return (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl p-2.5">
                    <CategoryIcon icon={meta.icon} color={meta.color} />
                    <button className="min-w-0 flex-1 text-left" onClick={() => openEdit(e)}>
                      <p className="truncate text-sm font-bold text-ink">{e.description}</p>
                      <p className="text-xs text-muted">{formatDate(e.date)} · {PAYMENT_METHODS[e.method]}</p>
                    </button>
                    <div className="flex flex-col items-end gap-1">
                      <p className="tabular text-sm font-bold text-ink">{money(e.amount)}</p>
                      <button onClick={() => toggleStatus(e)}>{e.status === 'pago' ? <Badge tone="ok">Pago</Badge> : <Badge tone="warn">Pendente</Badge>}</button>
                    </div>
                    <IconButton icon={Trash2} tone="danger" label="Excluir" onClick={() => del(e)} />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <ExpenseForm open={open} onClose={() => setOpen(false)} initial={editing} />
    </div>
  );
}
