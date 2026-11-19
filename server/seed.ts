import type { Param, Store } from './db.ts';

// Gera um conjunto de dados de DEMONSTRAÇÃO (fictícios) relativos à data de hoje.
// Usado apenas na conta de demonstração — nunca em contas reais.

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (y: number, m: number, d: number) => {
  const last = new Date(y, m + 1, 0).getDate();
  const date = new Date(y, m, Math.min(d, last));
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export async function wipeUserData(db: Store, userId: number) {
  for (const table of ['goal_deposits', 'goals', 'bills', 'expenses', 'incomes']) {
    await db.run(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
  }
}

/** INSERT com várias linhas numa só ida ao banco. */
async function bulkInsert(db: Store, table: string, cols: string[], rows: Param[][]) {
  if (!rows.length) return;
  const placeholders = rows.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ');
  await db.run(`INSERT INTO ${table} (${cols.join(', ')}) VALUES ${placeholders}`, rows.flat());
}

export async function seedDemo(store: Store, userId: number) {
  const rand = rng(20261118);
  const now = new Date();
  const today = ymd(now.getFullYear(), now.getMonth(), now.getDate());
  const reais = (min: number, max: number) => Math.round((min + rand() * (max - min)) * 100);

  const incomes: Param[][] = [];
  const expenses: Param[][] = [];
  const bills: Param[][] = [];

  const expenseTemplates: [string, string, string, number, number][] = [
    ['Mercado do mês', 'alimentacao', 'debito', 280, 420],
    ['Café com as amigas', 'alimentacao', 'pix', 25, 60],
    ['Lanche no trabalho', 'alimentacao', 'credito', 18, 40],
    ['Uber', 'transporte', 'credito', 15, 38],
    ['Recarga do cartão de transporte', 'transporte', 'pix', 80, 120],
    ['Blusinha nova', 'compras', 'credito', 70, 160],
    ['Manicure', 'beleza', 'pix', 45, 70],
    ['Skincare', 'beleza', 'credito', 60, 150],
    ['Farmácia', 'saude', 'debito', 30, 90],
    ['Cinema', 'lazer', 'credito', 35, 70],
    ['Curso online', 'estudos', 'credito', 49, 120],
    ['Livro', 'estudos', 'pix', 35, 80],
  ];

  for (let back = 5; back >= 0; back--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const isCurrent = back === 0;
    const lastDay = isCurrent ? now.getDate() : new Date(y, m + 1, 0).getDate();

    // Receitas
    if (!isCurrent || lastDay >= 5) incomes.push([userId, 'Salário', 320000, 'salario', ymd(y, m, 5), 'transferencia', '']);
    if (back % 2 === 1) incomes.push([userId, 'Freelance de design', reais(350, 900), 'freelance', ymd(y, m, 18), 'pix', 'Identidade visual para cliente']);
    if (back === 3) incomes.push([userId, 'Venda de roupas usadas', 18000, 'vendas', ymd(y, m, 22), 'pix', '']);
    if (back === 1) incomes.push([userId, 'Presente de aniversário', 25000, 'presente', ymd(y, m, 12), 'pix', 'Da vovó ♥']);

    // Despesas
    const count = isCurrent ? Math.max(3, Math.round((lastDay / 30) * 11)) : 11;
    for (let i = 0; i < count; i++) {
      const [desc, cat, method, min, max] = expenseTemplates[Math.floor(rand() * expenseTemplates.length)];
      const day = 1 + Math.floor(rand() * Math.max(1, lastDay));
      const pending = isCurrent && i >= count - 2;
      expenses.push([userId, desc, reais(min, max), cat, ymd(y, m, day), method, pending ? 'pendente' : 'pago', '']);
    }

    // Contas
    const monthBills: [string, number, number, string][] = [
      ['Aluguel', 110000, 10, 'moradia'],
      ['Internet', 9990, 15, 'moradia'],
      ['Conta de luz', reais(95, 160), 18, 'moradia'],
      ['Plano de celular', 5990, 20, 'assinaturas'],
      ['Streaming de músicas', 2190, 8, 'assinaturas'],
      ['Academia', 8990, 12, 'saude'],
    ];
    for (const [name, amount, day, cat] of monthBills) {
      const due = ymd(y, m, day);
      const recurrence = name === 'Conta de luz' ? 'nenhuma' : 'mensal';
      if (!isCurrent) {
        bills.push([userId, name, amount, due, cat, 'pago', ymd(y, m, day - 1), 'nenhuma', '']);
      } else {
        const overdue = name === 'Internet' && due < today;
        const paid = due < today && !overdue;
        bills.push([userId, name, amount, due, cat, paid ? 'pago' : 'pendente', paid ? due : null, paid ? 'nenhuma' : recurrence, '']);
        // as recorrentes já pagas geram a do mês seguinte
        if (paid && recurrence === 'mensal') {
          bills.push([userId, name, amount, ymd(y, m + 1, day), cat, 'pendente', null, 'mensal', '']);
        }
      }
    }
    if (isCurrent) {
      bills.push([userId, 'Fatura do cartão', reais(380, 520), ymd(y, m, now.getDate() + 3), 'compras', 'pendente', null, 'nenhuma', 'Compras parceladas']);
    }
  }

  const goals: [string, number, number, string, string, number[]][] = [
    ['Celular novo', 450000, 8, 'smartphone', 'rosa', [30000, 30000, 25000, 40000, 30000, 20000]],
    ['Viagem para a praia', 600000, 12, 'plane', 'ceu', [20000, 25000, 20000, 30000, 25000, 15000]],
    ['Reserva de emergência', 1000000, 18, 'shield', 'lavanda', [40000, 35000, 40000, 40000, 30000, 25000]],
    ['Roupas de inverno', 80000, 2, 'shirt', 'morango', [20000, 15000, 20000, 15000, 10000, 0]],
  ];

  await store.tx(async (db) => {
    await wipeUserData(db, userId);
    await bulkInsert(db, 'incomes', ['user_id', 'description', 'amount', 'category', 'date', 'method', 'notes'], incomes);
    await bulkInsert(db, 'expenses', ['user_id', 'description', 'amount', 'category', 'date', 'method', 'status', 'notes'], expenses);
    await bulkInsert(db, 'bills', ['user_id', 'name', 'amount', 'due_date', 'category', 'status', 'paid_at', 'recurrence', 'notes'], bills);

    const deposits: Param[][] = [];
    for (const [name, target, months, icon, color, amounts] of goals) {
      const deadline = ymd(now.getFullYear(), now.getMonth() + months, 28);
      const goalId = await db.insert(
        'INSERT INTO goals (user_id, name, target, deadline, icon, color) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
        [userId, name, target, deadline, icon, color],
      );
      amounts.forEach((amount, idx) => {
        if (!amount) return;
        const back = 5 - idx;
        const ref = new Date(now.getFullYear(), now.getMonth() - back, 1);
        const day = back === 0 ? Math.min(6, now.getDate()) : 6;
        deposits.push([userId, goalId, amount, ymd(ref.getFullYear(), ref.getMonth(), day), 'Guardado do salário']);
      });
    }
    await bulkInsert(db, 'goal_deposits', ['user_id', 'goal_id', 'amount', 'date', 'note'], deposits);
  });
}
