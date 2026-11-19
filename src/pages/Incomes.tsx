import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, TrendingUp, FilterX } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { IncomeForm } from '../components/forms.tsx';
import { usePeriod } from '../components/PeriodFilter.tsx';
import { Button, Card, CategoryIcon, EmptyState, IconButton, Input, Options, PageHeader, Select, useConfirm } from '../components/ui.tsx';
import { INCOME_CATEGORIES, INCOME_META, INCOME_METHODS } from '../lib/catalog.tsx';
import { formatDate, today } from '../lib/dates.ts';
import { money } from '../lib/format.ts';
import type { Income } from '../lib/types.ts';

export function IncomesPage() {
  const { data, remove } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const period = usePeriod();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<Income | null>(null);
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.incomes.filter((i) =>
      period.inPeriod(i.date) && (!category || i.category === category) &&
      (!q || i.description.toLowerCase().includes(q) || i.notes.toLowerCase().includes(q)),
    );
  }, [data.incomes, period, query, category]);

  const total = rows.reduce((a, i) => a + i.amount, 0);
  const future = rows.filter((i) => i.date > today()).reduce((a, i) => a + i.amount, 0);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => m.set(r.category, (m.get(r.category) ?? 0) + r.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const del = async (i: Income) => {
    const ok = await confirm({ title: 'Excluir receita?', text: `"${i.description}" (${money(i.amount)}) será excluída permanentemente.`, confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    try {
      await remove('incomes', i.id);
      toast.success('Receita excluída.');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (i: Income) => { setEditing(i); setOpen(true); };

  return (
    <div>
      <PageHeader title="Receitas" subtitle="Salário, freelas e tudo o que entra" actions={<Button icon={Plus} onClick={openNew}>Nova receita</Button>} />

      <Card className="mb-5 grid gap-3">
        {period.ui}
        <div className="grid gap-2 sm:grid-cols-[1fr_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pesquisar receitas…" className="pl-11" aria-label="Pesquisar" />
          </div>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Categoria">
            <option value="">Todas as categorias</option><Options map={INCOME_CATEGORIES} />
          </Select>
          {(query || category) && <Button variant="ghost" icon={FilterX} onClick={() => { setQuery(''); setCategory(''); }}>Limpar</Button>}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <Card className="p-2 sm:p-3">
          {rows.length === 0 ? (
            <EmptyState icon={TrendingUp} title="Nenhuma receita neste período" text="Cadastre o que você recebe para o saldo ficar certinho."
              action={<Button icon={Plus} onClick={openNew}>Adicionar receita</Button>} />
          ) : (
            <ul className="grid">
              {rows.map((i) => {
                const meta = INCOME_META[i.category];
                return (
                  <li key={i.id} className="group flex items-center gap-3 border-b border-line p-3 last:border-0">
                    <CategoryIcon icon={meta.icon} color={meta.color} />
                    <button className="min-w-0 flex-1 text-left" onClick={() => openEdit(i)}>
                      <p className="truncate text-sm font-bold text-ink">{i.description}</p>
                      <p className="text-xs text-muted">
                        {INCOME_CATEGORIES[i.category]} · {formatDate(i.date)} · {INCOME_METHODS[i.method]}
                        {i.date > today() && <span className="ml-1 font-bold text-info">· a receber</span>}
                      </p>
                      {i.notes && <p className="truncate text-xs text-muted/80">{i.notes}</p>}
                    </button>
                    <p className="tabular text-sm font-bold text-ok">+{money(i.amount)}</p>
                    <div className="flex">
                      <IconButton icon={Pencil} label="Editar" onClick={() => openEdit(i)} className="hidden sm:inline-flex" />
                      <IconButton icon={Trash2} tone="danger" label="Excluir" onClick={() => del(i)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <p className="text-sm font-bold text-muted">Total no período</p>
            <p className="tabular mt-1 font-display text-3xl font-bold text-ok">{money(total)}</p>
            <p className="mt-1 text-xs text-muted">{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}{future > 0 && ` · ${money(future)} a receber`}</p>
          </Card>
          {byCat.length > 0 && (
            <Card>
              <p className="mb-3 text-sm font-bold text-muted">Por categoria</p>
              <ul className="grid gap-3">
                {byCat.map(([cat, v]) => (
                  <li key={cat}>
                    <div className="mb-1 flex justify-between text-sm"><span className="font-bold text-ink">{INCOME_CATEGORIES[cat as keyof typeof INCOME_CATEGORIES]}</span><span className="tabular text-muted">{money(v)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full" style={{ width: `${(v / total) * 100}%`, background: INCOME_META[cat].color }} /></div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <IncomeForm open={open} onClose={() => setOpen(false)} initial={editing} />
    </div>
  );
}
