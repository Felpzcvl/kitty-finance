import { useEffect, useState, type FormEvent } from 'react';
import { useData } from '../context/DataContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import {
  BILL_STATUS, EXPENSE_CATEGORIES, EXPENSE_STATUS, GOAL_COLORS, GOAL_COLOR_MAP, GOAL_ICONS, GOAL_ICON_MAP,
  INCOME_CATEGORIES, INCOME_METHODS, PAYMENT_METHODS, RECURRENCE,
} from '../lib/catalog.tsx';
import { centsToInput, money, parseMoney } from '../lib/format.ts';
import { today } from '../lib/dates.ts';
import type { Bill, Expense, Goal, Income } from '../lib/types.ts';
import { Button, Field, Input, Modal, MoneyInput, Options, Select, Textarea, cx } from './ui.tsx';

type Errors = Record<string, string>;

function useSubmit(onDone: () => void) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const run = async (fn: () => Promise<void>, successMsg: string) => {
    setSaving(true);
    try {
      await fn();
      toast.success(successMsg);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  return { saving, run };
}

function checkAmount(text: string, errs: Errors, key = 'amount') {
  const cents = parseMoney(text);
  if (cents === null || cents <= 0) errs[key] = 'Informe um valor maior que zero.';
  else if (cents > 100_000_000_00) errs[key] = 'Valor acima do limite.';
  return cents ?? 0;
}

function Footer({ onClose, saving, isEdit, form }: { onClose: () => void; saving: boolean; isEdit: boolean; form: string }) {
  return (
    <>
      <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
      <Button type="submit" form={form} loading={saving}>{isEdit ? 'Salvar alterações' : 'Adicionar'}</Button>
    </>
  );
}

// ---------------- Receita ----------------

export function IncomeForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Income | null }) {
  const { create, update } = useData();
  const { saving, run } = useSubmit(onClose);
  const [f, setF] = useState({ description: '', amount: '', category: 'salario', date: today(), method: 'pix', notes: '' });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(initial
      ? { ...initial, amount: centsToInput(initial.amount) }
      : { description: '', amount: '', category: 'salario', date: today(), method: 'pix', notes: '' });
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.description.trim()) errs.description = 'Dê um nome para essa receita.';
    const amount = checkAmount(f.amount, errs);
    if (!f.date) errs.date = 'Informe a data.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { ...f, amount };
    void run(
      () => (initial ? update('incomes', initial.id, body) : create('incomes', body)),
      initial ? 'Receita atualizada!' : 'Receita adicionada ♥',
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar receita' : 'Nova receita'} subtitle="Dinheiro que entrou (ou vai entrar)"
      footer={<Footer onClose={onClose} saving={saving} isEdit={!!initial} form="income-form" />}>
      <form id="income-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Descrição" error={errors.description} className="sm:col-span-2">
          {(id) => <Input id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ex.: Salário, freelance…" maxLength={120} invalid={!!errors.description} />}
        </Field>
        <Field label="Valor" error={errors.amount}>
          {(id) => <MoneyInput id={id} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} invalid={!!errors.amount} />}
        </Field>
        <Field label="Data de recebimento" error={errors.date}>
          {(id) => <Input id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} invalid={!!errors.date} />}
        </Field>
        <Field label="Categoria">
          {(id) => <Select id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><Options map={INCOME_CATEGORIES} /></Select>}
        </Field>
        <Field label="Forma de recebimento">
          {(id) => <Select id={id} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><Options map={INCOME_METHODS} /></Select>}
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Opcional" maxLength={500} />}
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Despesa ----------------

export function ExpenseForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Expense | null }) {
  const { create, update } = useData();
  const { saving, run } = useSubmit(onClose);
  const blank = { description: '', amount: '', category: 'alimentacao', date: today(), method: 'pix', status: 'pago', notes: '' };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(initial ? { ...initial, amount: centsToInput(initial.amount) } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.description.trim()) errs.description = 'Descreva o gasto.';
    const amount = checkAmount(f.amount, errs);
    if (!f.date) errs.date = 'Informe a data.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { ...f, amount };
    void run(
      () => (initial ? update('expenses', initial.id, body) : create('expenses', body)),
      initial ? 'Despesa atualizada!' : 'Despesa registrada!',
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar despesa' : 'Nova despesa'} subtitle="Registre um gasto"
      footer={<Footer onClose={onClose} saving={saving} isEdit={!!initial} form="expense-form" />}>
      <form id="expense-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Descrição" error={errors.description} className="sm:col-span-2">
          {(id) => <Input id={id} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ex.: Mercado, Uber, skincare…" maxLength={120} invalid={!!errors.description} />}
        </Field>
        <Field label="Valor" error={errors.amount}>
          {(id) => <MoneyInput id={id} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} invalid={!!errors.amount} />}
        </Field>
        <Field label="Data" error={errors.date}>
          {(id) => <Input id={id} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} invalid={!!errors.date} />}
        </Field>
        <Field label="Categoria">
          {(id) => <Select id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><Options map={EXPENSE_CATEGORIES} /></Select>}
        </Field>
        <Field label="Forma de pagamento">
          {(id) => <Select id={id} value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })}><Options map={PAYMENT_METHODS} /></Select>}
        </Field>
        <Field label="Status" className="sm:col-span-2">
          {() => (
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(EXPENSE_STATUS).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setF({ ...f, status: v })}
                  className={cx('rounded-2xl border px-4 py-2.5 text-sm font-bold transition',
                    f.status === v ? (v === 'pago' ? 'border-ok bg-ok-soft text-ok' : 'border-warn bg-warn-soft text-warn') : 'border-line text-muted hover:bg-soft')}
                  aria-pressed={f.status === v}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </Field>
        <Field label="Observações" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Opcional" maxLength={500} />}
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Conta a pagar ----------------

export function BillForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Bill | null }) {
  const { create, update } = useData();
  const { saving, run } = useSubmit(onClose);
  const blank = { name: '', amount: '', due_date: today(), category: 'moradia', status: 'pendente', paid_at: '', recurrence: 'nenhuma', notes: '' };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(initial ? { ...initial, amount: centsToInput(initial.amount), paid_at: initial.paid_at ?? '' } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.name.trim()) errs.name = 'Dê um nome para a conta.';
    const amount = checkAmount(f.amount, errs);
    if (!f.due_date) errs.due_date = 'Informe o vencimento.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { ...f, amount, paid_at: f.status === 'pago' ? f.paid_at || today() : null };
    void run(
      () => (initial ? update('bills', initial.id, body) : create('bills', body)),
      initial ? 'Conta atualizada!' : 'Conta adicionada!',
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar conta' : 'Nova conta a pagar'} subtitle="Boletos, faturas e compromissos"
      footer={<Footer onClose={onClose} saving={saving} isEdit={!!initial} form="bill-form" />}>
      <form id="bill-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nome da conta" error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Aluguel, internet, fatura…" maxLength={120} invalid={!!errors.name} />}
        </Field>
        <Field label="Valor" error={errors.amount}>
          {(id) => <MoneyInput id={id} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} invalid={!!errors.amount} />}
        </Field>
        <Field label="Vencimento" error={errors.due_date}>
          {(id) => <Input id={id} type="date" value={f.due_date} onChange={(e) => setF({ ...f, due_date: e.target.value })} invalid={!!errors.due_date} />}
        </Field>
        <Field label="Categoria">
          {(id) => <Select id={id} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><Options map={EXPENSE_CATEGORIES} /></Select>}
        </Field>
        <Field label="Repetição" hint={f.recurrence === 'mensal' ? 'Ao pagar, a do próximo mês é criada sozinha.' : undefined}>
          {(id) => <Select id={id} value={f.recurrence} onChange={(e) => setF({ ...f, recurrence: e.target.value })}><Options map={RECURRENCE} /></Select>}
        </Field>
        <Field label="Status">
          {(id) => <Select id={id} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><Options map={BILL_STATUS} /></Select>}
        </Field>
        {f.status === 'pago' ? (
          <Field label="Pago em">
            {(id) => <Input id={id} type="date" value={f.paid_at || today()} onChange={(e) => setF({ ...f, paid_at: e.target.value })} />}
          </Field>
        ) : <div className="hidden sm:block" />}
        <Field label="Observações" className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Opcional" maxLength={500} />}
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Meta ----------------

export function GoalForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: Goal | null }) {
  const { create, update } = useData();
  const { saving, run } = useSubmit(onClose);
  const blank = { name: '', target: '', deadline: '', icon: 'heart', color: 'rosa' };
  const [f, setF] = useState(blank);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setF(initial ? { name: initial.name, target: centsToInput(initial.target), deadline: initial.deadline ?? '', icon: initial.icon, color: initial.color } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!f.name.trim()) errs.name = 'Dê um nome para a meta.';
    const target = checkAmount(f.target, errs, 'target');
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const body = { ...f, target, deadline: f.deadline || null };
    void run(
      () => (initial ? update('goals', initial.id, body) : create('goals', body)),
      initial ? 'Meta atualizada!' : 'Meta criada! Rumo ao objetivo ♥',
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Editar meta' : 'Nova meta'} subtitle="Um sonho com valor e prazo"
      footer={<Footer onClose={onClose} saving={saving} isEdit={!!initial} form="goal-form" />}>
      <form id="goal-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nome da meta" error={errors.name} className="sm:col-span-2">
          {(id) => <Input id={id} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Viagem, celular novo…" maxLength={80} invalid={!!errors.name} />}
        </Field>
        <Field label="Valor desejado" error={errors.target}>
          {(id) => <MoneyInput id={id} value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} invalid={!!errors.target} />}
        </Field>
        <Field label="Prazo" hint="Opcional">
          {(id) => <Input id={id} type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />}
        </Field>
        <Field label="Ícone" className="sm:col-span-2">
          {() => (
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map((ic) => {
                const I = GOAL_ICON_MAP[ic];
                return (
                  <button key={ic} type="button" onClick={() => setF({ ...f, icon: ic })} aria-pressed={f.icon === ic} aria-label={ic}
                    className={cx('flex size-10 items-center justify-center rounded-2xl border transition', f.icon === ic ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-line text-muted hover:bg-soft')}>
                    <I className="size-[18px]" />
                  </button>
                );
              })}
            </div>
          )}
        </Field>
        <Field label="Cor" className="sm:col-span-2">
          {() => (
            <div className="flex flex-wrap gap-2">
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setF({ ...f, color: c })} aria-pressed={f.color === c} aria-label={GOAL_COLOR_MAP[c].label}
                  title={GOAL_COLOR_MAP[c].label}
                  className={cx('size-9 rounded-full border-4 transition', f.color === c ? 'border-card ring-2 ring-ink/30' : 'border-card')}
                  style={{ background: GOAL_COLOR_MAP[c].bar }} />
              ))}
            </div>
          )}
        </Field>
      </form>
    </Modal>
  );
}

// ---------------- Guardar / retirar da meta ----------------

export function DepositForm({ goal, mode, onClose }: { goal: Goal | null; mode: 'add' | 'withdraw'; onClose: () => void }) {
  const { addDeposit } = useData();
  const { saving, run } = useSubmit(onClose);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!goal) return;
    setAmount(''); setDate(today()); setNote(''); setError('');
  }, [goal]);

  if (!goal) return null;
  const remaining = Math.max(0, goal.target - goal.saved);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    const cents = checkAmount(amount, errs);
    if (errs.amount) return setError(errs.amount);
    if (mode === 'withdraw' && cents > goal.saved) return setError(`Você tem ${money(goal.saved)} guardados nessa meta.`);
    setError('');
    void run(
      () => addDeposit(goal.id, { amount: mode === 'add' ? cents : -cents, date, note }),
      mode === 'add' ? `${money(cents)} guardados em "${goal.name}" ♥` : `${money(cents)} retirados de "${goal.name}"`,
    );
  };

  return (
    <Modal open onClose={onClose} size="sm" title={mode === 'add' ? 'Guardar dinheiro' : 'Retirar dinheiro'} subtitle={goal.name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" form="deposit-form" loading={saving} variant={mode === 'add' ? 'primary' : 'danger'}>{mode === 'add' ? 'Guardar' : 'Retirar'}</Button>
        </>
      }>
      <form id="deposit-form" onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-soft p-3 text-center text-sm">
          <div><p className="text-xs text-muted">Guardado</p><p className="tabular font-bold text-ink">{money(goal.saved)}</p></div>
          <div><p className="text-xs text-muted">Falta</p><p className="tabular font-bold text-ink">{money(remaining)}</p></div>
        </div>
        <Field label="Valor" error={error}>
          {(id) => <MoneyInput id={id} value={amount} onChange={(e) => setAmount(e.target.value)} invalid={!!error} />}
        </Field>
        {mode === 'add' && remaining > 0 && (
          <div className="-mt-2 flex flex-wrap gap-2">
            {[5000, 10000, 20000].filter((v) => v <= remaining).map((v) => (
              <button key={v} type="button" onClick={() => setAmount(centsToInput(v))} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 hover:bg-brand-100">+ {money(v)}</button>
            ))}
            <button type="button" onClick={() => setAmount(centsToInput(remaining))} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-600 hover:bg-brand-100">Completar meta</button>
          </div>
        )}
        <Field label="Data">
          {(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}
        </Field>
        <Field label="Observação">
          {(id) => <Input id={id} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" maxLength={200} />}
        </Field>
        {mode === 'add' && <p className="text-xs text-muted">O valor sai do seu saldo disponível e vai para a meta.</p>}
        {mode === 'withdraw' && <p className="text-xs text-muted">O valor volta para o seu saldo disponível.</p>}
      </form>
    </Modal>
  );
}
