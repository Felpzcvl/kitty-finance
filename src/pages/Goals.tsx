import { useMemo, useState } from 'react';
import { CalendarClock, History, Minus, Pencil, PiggyBank, Plus, Target, Trash2, PartyPopper } from 'lucide-react';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { DepositForm, GoalForm } from '../components/forms.tsx';
import { Heart } from '../components/Kitty.tsx';
import { Badge, Button, Card, CategoryIcon, EmptyState, IconButton, Modal, PageHeader, ProgressBar, useConfirm } from '../components/ui.tsx';
import { GOAL_COLOR_MAP, GOAL_ICON_MAP } from '../lib/catalog.tsx';
import { daysBetween, formatDate, today } from '../lib/dates.ts';
import { money, percent } from '../lib/format.ts';
import type { Goal } from '../lib/types.ts';

function monthlyNeeded(g: Goal) {
  if (!g.deadline || g.saved >= g.target) return null;
  const days = daysBetween(today(), g.deadline);
  if (days <= 0) return { late: true, value: g.target - g.saved };
  const months = Math.max(1, Math.ceil(days / 30));
  return { late: false, value: Math.ceil((g.target - g.saved) / months), months };
}

export function GoalsPage() {
  const { data, remove, removeDeposit } = useData();
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState<Goal | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deposit, setDeposit] = useState<{ goal: Goal; mode: 'add' | 'withdraw' } | null>(null);
  const [historyOf, setHistoryOf] = useState<Goal | null>(null);

  const totals = useMemo(() => {
    const target = data.goals.reduce((a, g) => a + g.target, 0);
    const saved = data.goals.reduce((a, g) => a + g.saved, 0);
    return { target, saved, done: data.goals.filter((g) => g.saved >= g.target).length };
  }, [data.goals]);

  const history = historyOf ? data.deposits.filter((d) => d.goal_id === historyOf.id) : [];

  const del = async (g: Goal) => {
    const ok = await confirm({
      title: 'Excluir meta?',
      text: `"${g.name}" e todo o histórico de aportes serão excluídos. ${g.saved > 0 ? `Os ${money(g.saved)} guardados voltam para o saldo disponível.` : ''}`,
      confirmLabel: 'Excluir meta', danger: true,
    });
    if (!ok) return;
    try {
      await remove('goals', g.id);
      toast.success('Meta excluída.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const delDeposit = async (id: number) => {
    const ok = await confirm({ title: 'Excluir esse movimento?', text: 'O valor da meta e o saldo disponível serão recalculados.', confirmLabel: 'Excluir', danger: true });
    if (!ok) return;
    try {
      await removeDeposit(id);
      toast.success('Movimento excluído.');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader title="Metas financeiras" subtitle="Seus sonhos, um pouquinho por vez"
        actions={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Nova meta</Button>} />

      {data.goals.length > 0 && (
        <Card className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-sm font-bold text-muted">Total guardado em metas</p>
            <p className="tabular font-display text-3xl font-bold text-ink">{money(totals.saved)} <span className="text-base text-muted">de {money(totals.target)}</span></p>
            <ProgressBar value={totals.target ? (totals.saved / totals.target) * 100 : 0} className="mt-3 h-3" />
          </div>
          <div className="flex gap-3 sm:flex-col sm:text-right">
            <Badge tone="brand">{data.goals.length} metas</Badge>
            <Badge tone="ok">{totals.done} concluída{totals.done === 1 ? '' : 's'}</Badge>
          </div>
        </Card>
      )}

      {data.goals.length === 0 ? (
        <Card>
          <EmptyState icon={Target} title="Crie sua primeira meta" text="Celular novo, viagem, reserva de emergência… defina o valor e acompanhe cada passo."
            action={<Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Criar meta</Button>} />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.goals.map((g) => {
            const pct = g.target ? (g.saved / g.target) * 100 : 0;
            const done = g.saved >= g.target;
            const c = GOAL_COLOR_MAP[g.color];
            const I = GOAL_ICON_MAP[g.icon];
            const need = monthlyNeeded(g);
            return (
              <Card key={g.id} className="animate-fade-up relative flex flex-col overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-20" style={{ background: `linear-gradient(180deg, color-mix(in oklab, ${c.bar} 16%, transparent), transparent)` }} />
                <div className="relative flex items-start gap-3">
                  <CategoryIcon icon={I} color={c.bar} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-ink">{g.name}</p>
                    {g.deadline && (
                      <p className="flex items-center gap-1 text-xs text-muted"><CalendarClock className="size-3.5" /> até {formatDate(g.deadline)}</p>
                    )}
                  </div>
                  <div className="-mt-1 -mr-2 flex">
                    <IconButton icon={History} label="Histórico" onClick={() => setHistoryOf(g)} />
                    <IconButton icon={Pencil} label="Editar meta" onClick={() => { setEditing(g); setFormOpen(true); }} />
                    <IconButton icon={Trash2} tone="danger" label="Excluir meta" onClick={() => del(g)} />
                  </div>
                </div>

                <div className="relative my-5 flex items-end justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted">Guardado</p>
                    <p className="tabular font-display text-2xl font-bold text-ink">{money(g.saved)}</p>
                    <p className="tabular text-xs text-muted">meta: {money(g.target)}</p>
                  </div>
                  <p className="font-display text-3xl font-bold" style={{ color: c.bar }}>{percent(Math.min(100, pct))}</p>
                </div>
                <ProgressBar value={pct} color={c.bar} className="h-3" />

                <div className="mt-3 min-h-10 text-xs text-muted">
                  {done ? (
                    <p className="flex items-center gap-1.5 font-bold text-ok"><PartyPopper className="size-4" /> Meta concluída! Parabéns ♥</p>
                  ) : need?.late ? (
                    <p className="font-semibold text-bad">O prazo passou. Faltam {money(need.value)}: que tal ajustar a data?</p>
                  ) : need ? (
                    <p>Guardando <strong className="text-ink">{money(need.value)}/mês</strong> você chega lá em {need.months} {need.months === 1 ? 'mês' : 'meses'}.</p>
                  ) : (
                    <p>Faltam <strong className="text-ink">{money(g.target - g.saved)}</strong>.</p>
                  )}
                </div>

                <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-3">
                  <Button size="sm" icon={PiggyBank} onClick={() => setDeposit({ goal: g, mode: 'add' })} disabled={done}>
                    {done ? 'Concluída' : 'Guardar dinheiro'}
                  </Button>
                  <Button size="sm" variant="secondary" icon={Minus} onClick={() => setDeposit({ goal: g, mode: 'withdraw' })} disabled={g.saved <= 0} aria-label="Retirar dinheiro">
                    Retirar
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <GoalForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />
      <DepositForm goal={deposit?.goal ?? null} mode={deposit?.mode ?? 'add'} onClose={() => setDeposit(null)} />

      <Modal open={!!historyOf} onClose={() => setHistoryOf(null)} title="Histórico da meta" subtitle={historyOf?.name}>
        {history.length === 0 ? (
          <EmptyState icon={PiggyBank} title="Nenhum movimento ainda" />
        ) : (
          <ul className="grid gap-1">
            {history.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-soft">
                <span className={`flex size-9 items-center justify-center rounded-xl ${d.amount > 0 ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
                  {d.amount > 0 ? <Heart className="size-4" /> : <Minus className="size-4" />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{d.amount > 0 ? 'Guardado' : 'Retirado'}</p>
                  <p className="text-xs text-muted">{formatDate(d.date)}{d.note && ` · ${d.note}`}</p>
                </div>
                <p className={`tabular text-sm font-bold ${d.amount > 0 ? 'text-ok' : 'text-bad'}`}>{d.amount > 0 ? '+' : '−'}{money(Math.abs(d.amount))}</p>
                <IconButton icon={Trash2} tone="danger" label="Excluir movimento" onClick={() => delDeposit(d.id)} />
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
