import express, { type NextFunction, type Request, type Response } from 'express';
import { getStore, type Param, type Row } from './db.ts';
import {
  type AuthedRequest, createToken, hashPassword, loginRateLimit, requireAuth, verifyPassword,
} from './auth.ts';
import { DEPOSIT_SCHEMA, RESOURCES } from './resources.ts';
import { ValidationError, isValidDate, validate } from './validate.ts';
import { seedDemo, wipeUserData } from './seed.ts';

const DEMO_EMAIL = 'demo@kittyfinance.local';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '1mb' }));

// ---------- utilidades ----------

const DEFAULT_SETTINGS = {
  currency: 'BRL',
  theme: 'light',
  accent: 'rosa',
  decorations: true,
  notifications: { inApp: true, browser: false, daysBefore: 3 },
};

/** Data de hoje no fuso do Brasil (o servidor na nuvem roda em UTC). */
function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

function addMonth(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m, 1); // mês seguinte (m já é 1-based)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, last));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}

function publicUser(row: Row) {
  let settings = DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(String(row.settings ?? '{}'));
    settings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications ?? {}) },
    };
  } catch { /* usa padrão */ }
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    avatar: row.avatar ?? null,
    isDemo: Boolean(row.is_demo),
    createdAt: row.created_at,
    settings,
  };
}

async function getUser(id: number) {
  const db = await getStore();
  return db.get('SELECT * FROM users WHERE id = ?', [id]);
}

function sanitizeSettings(input: unknown) {
  if (!input || typeof input !== 'object') throw new ValidationError('Configurações inválidas.');
  const s = input as Record<string, unknown>;
  const n = (s.notifications ?? {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  const days = Number(n.daysBefore);
  return {
    currency: pick(s.currency, ['BRL', 'USD', 'EUR'] as const, 'BRL'),
    theme: pick(s.theme, ['light', 'dark', 'system'] as const, 'light'),
    accent: pick(s.accent, ['rosa', 'morango', 'lavanda'] as const, 'rosa'),
    decorations: s.decorations !== false,
    notifications: {
      inApp: n.inApp !== false,
      browser: n.browser === true,
      daysBefore: Number.isInteger(days) && days >= 0 && days <= 30 ? days : 3,
    },
  };
}

const wrap =
  (fn: (req: AuthedRequest, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req as AuthedRequest, res)
      .then((out) => {
        if (out !== undefined && !res.headersSent) res.json(out);
      })
      .catch(next);
  };

const idParam = (req: Request) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('Registro inválido.');
  return id;
};

function fail(message: string, status: number): never {
  const err = new ValidationError(message);
  err.status = status;
  throw err;
}
function notFound(): never {
  fail('Registro não encontrado.', 404);
}

/** Converte as colunas numéricas para number (o Postgres devolve BIGINT/IDs). */
function num(rows: Row[]) {
  for (const r of rows) {
    for (const k of ['id', 'user_id', 'goal_id', 'amount', 'target', 'saved']) {
      if (k in r && r[k] !== null) r[k] = Number(r[k]);
    }
  }
  return rows;
}

// ---------- autenticação ----------

app.post('/api/auth/register', loginRateLimit, wrap(async (req, res) => {
  const db = await getStore();
  const { name, email, password } = req.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (cleanName.length < 2 || cleanName.length > 60) throw new ValidationError('Informe seu nome (2 a 60 caracteres).');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 120) throw new ValidationError('Informe um e-mail válido.');
  if (cleanEmail === DEMO_EMAIL) throw new ValidationError('Esse e-mail é reservado para a demonstração.');
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    throw new ValidationError('A senha precisa ter pelo menos 6 caracteres.');
  }
  if (await db.get('SELECT 1 AS ok FROM users WHERE email = ?', [cleanEmail])) {
    throw new ValidationError('Já existe uma conta com esse e-mail.');
  }
  const id = await db.insert(
    'INSERT INTO users (name, email, password_hash, settings) VALUES (?, ?, ?, ?) RETURNING id',
    [cleanName, cleanEmail, hashPassword(password), JSON.stringify(DEFAULT_SETTINGS)],
  );
  res.status(201);
  return { token: await createToken(id), user: publicUser((await getUser(id))!) };
}));

app.post('/api/auth/login', loginRateLimit, wrap(async (req) => {
  const db = await getStore();
  const { email, password } = req.body ?? {};
  const row = typeof email === 'string'
    ? await db.get('SELECT * FROM users WHERE email = ? AND is_demo = 0', [email.trim().toLowerCase()])
    : undefined;
  if (!row || typeof password !== 'string' || !verifyPassword(password, String(row.password_hash))) {
    fail('E-mail ou senha incorretos.', 401);
  }
  return { token: await createToken(Number(row.id)), user: publicUser(row) };
}));

app.post('/api/auth/demo', wrap(async () => {
  const db = await getStore();
  let row = await db.get('SELECT * FROM users WHERE email = ?', [DEMO_EMAIL]);
  if (!row) {
    const id = await db.insert(
      'INSERT INTO users (name, email, password_hash, settings, is_demo) VALUES (?, ?, ?, ?, 1) ON CONFLICT (email) DO UPDATE SET is_demo = 1 RETURNING id',
      ['Visitante', DEMO_EMAIL, hashPassword(crypto.randomUUID()), JSON.stringify(DEFAULT_SETTINGS)],
    );
    await seedDemo(db, id);
    row = (await getUser(id))!;
  }
  return { token: await createToken(Number(row.id)), user: publicUser(row) };
}));

// Daqui pra baixo, tudo exige login.
app.use('/api', requireAuth);

// ---------- perfil ----------

app.get('/api/me', wrap(async (req) => {
  const row = await getUser(req.userId);
  if (!row) fail('Conta não encontrada.', 401);
  return publicUser(row);
}));

app.put('/api/me', wrap(async (req) => {
  const db = await getStore();
  const { name, avatar, settings } = req.body ?? {};
  const row = (await getUser(req.userId))!;
  const cleanName = name === undefined ? String(row.name) : typeof name === 'string' ? name.trim() : '';
  if (cleanName.length < 2 || cleanName.length > 60) throw new ValidationError('Informe seu nome (2 a 60 caracteres).');
  let cleanAvatar = (row.avatar as string | null) ?? null;
  if (avatar !== undefined) {
    if (avatar === null || avatar === '') cleanAvatar = null;
    else if (typeof avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(avatar) && avatar.length < 600_000) cleanAvatar = avatar;
    else throw new ValidationError('Use uma imagem PNG, JPG ou WEBP de até 400 KB.');
  }
  const cleanSettings = settings === undefined ? JSON.parse(String(row.settings)) : sanitizeSettings(settings);
  await db.run('UPDATE users SET name = ?, avatar = ?, settings = ? WHERE id = ?',
    [cleanName, cleanAvatar, JSON.stringify(cleanSettings), req.userId]);
  return publicUser((await getUser(req.userId))!);
}));

app.put('/api/me/password', wrap(async (req) => {
  const db = await getStore();
  const row = (await getUser(req.userId))!;
  if (Number(row.is_demo)) throw new ValidationError('A conta de demonstração não tem senha.');
  const { current, next } = req.body ?? {};
  if (typeof current !== 'string' || !verifyPassword(current, String(row.password_hash))) {
    throw new ValidationError('A senha atual está incorreta.');
  }
  if (typeof next !== 'string' || next.length < 6 || next.length > 128) {
    throw new ValidationError('A nova senha precisa ter pelo menos 6 caracteres.');
  }
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(next), req.userId]);
  return { ok: true };
}));

app.delete('/api/me/data', wrap(async (req) => {
  const db = await getStore();
  await db.tx((t) => wipeUserData(t, req.userId));
  return { ok: true };
}));

app.post('/api/me/demo-reset', wrap(async (req) => {
  const db = await getStore();
  const row = (await getUser(req.userId))!;
  if (!Number(row.is_demo)) throw new ValidationError('Disponível apenas na conta de demonstração.');
  await seedDemo(db, req.userId);
  return { ok: true };
}));

// ---------- dados ----------

const GOALS_SQL = `
  SELECT g.*, COALESCE((SELECT SUM(d.amount) FROM goal_deposits d WHERE d.goal_id = g.id), 0) AS saved
  FROM goals g WHERE g.user_id = ? ORDER BY g.id ASC`;

async function listGoals(userId: number) {
  const db = await getStore();
  return num(await db.all(GOALS_SQL, [userId]));
}

app.get('/api/data', wrap(async (req) => {
  const db = await getStore();
  const uid = req.userId;
  const [incomes, expenses, bills, goals, deposits] = await Promise.all([
    db.all(`SELECT * FROM incomes WHERE user_id = ? ORDER BY ${RESOURCES.incomes.orderBy}`, [uid]),
    db.all(`SELECT * FROM expenses WHERE user_id = ? ORDER BY ${RESOURCES.expenses.orderBy}`, [uid]),
    db.all(`SELECT * FROM bills WHERE user_id = ? ORDER BY ${RESOURCES.bills.orderBy}`, [uid]),
    listGoals(uid),
    db.all('SELECT * FROM goal_deposits WHERE user_id = ? ORDER BY date DESC, id DESC', [uid]),
  ]);
  return { incomes: num(incomes), expenses: num(expenses), bills: num(bills), goals, deposits: num(deposits) };
}));

// Contas: marcar como paga / pendente
app.post('/api/bills/:id/pay', wrap(async (req) => {
  const db = await getStore();
  const id = idParam(req);
  const bill = await db.get('SELECT * FROM bills WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!bill) notFound();
  const paidAt = req.body?.paid_at ?? todayStr();
  if (!isValidDate(paidAt)) throw new ValidationError('Data de pagamento inválida.');
  const nextId = await db.tx(async (t) => {
    await t.run("UPDATE bills SET status = 'pago', paid_at = ?, recurrence = 'nenhuma' WHERE id = ?", [paidAt, id]);
    if (bill.recurrence !== 'mensal') return null;
    return t.insert(
      `INSERT INTO bills (user_id, name, amount, due_date, category, status, recurrence, notes)
       VALUES (?, ?, ?, ?, ?, 'pendente', 'mensal', ?) RETURNING id`,
      [req.userId, bill.name as string, Number(bill.amount), addMonth(String(bill.due_date)), bill.category as string, bill.notes as string],
    );
  });
  const [updated] = num([(await db.get('SELECT * FROM bills WHERE id = ?', [id]))!]);
  const next = nextId ? num([(await db.get('SELECT * FROM bills WHERE id = ?', [nextId]))!])[0] : null;
  return { bill: updated, next };
}));

app.post('/api/bills/:id/unpay', wrap(async (req) => {
  const db = await getStore();
  const id = idParam(req);
  const r = await db.run("UPDATE bills SET status = 'pendente', paid_at = NULL WHERE id = ? AND user_id = ?", [id, req.userId]);
  if (!r.changes) notFound();
  return { bill: num([(await db.get('SELECT * FROM bills WHERE id = ?', [id]))!])[0] };
}));

// Metas: guardar / retirar dinheiro
app.post('/api/goals/:id/deposits', wrap(async (req, res) => {
  const db = await getStore();
  const id = idParam(req);
  const goal = (await listGoals(req.userId)).find((g) => g.id === id);
  if (!goal) notFound();
  const data = validate(DEPOSIT_SCHEMA, req.body);
  const amount = data.amount as number;
  if (Number(goal.saved) + amount < 0) throw new ValidationError('Você não pode retirar mais do que já guardou nessa meta.');
  const depId = await db.insert(
    'INSERT INTO goal_deposits (user_id, goal_id, amount, date, note) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [req.userId, id, amount, data.date as string, (data.note as string) ?? ''],
  );
  res.status(201);
  return num([(await db.get('SELECT * FROM goal_deposits WHERE id = ?', [depId]))!])[0];
}));

app.delete('/api/goal-deposits/:id', wrap(async (req) => {
  const db = await getStore();
  const id = idParam(req);
  const r = await db.run('DELETE FROM goal_deposits WHERE id = ? AND user_id = ?', [id, req.userId]);
  if (!r.changes) notFound();
  return { ok: true };
}));

// CRUD genérico: receitas, despesas, contas e metas
for (const [name, def] of Object.entries(RESOURCES)) {
  const cols = Object.keys(def.schema);

  const normalize = (data: Record<string, Param>) => {
    if (name === 'bills') {
      if (data.status === 'pago' && !data.paid_at) data.paid_at = todayStr();
      if (data.status === 'pendente') data.paid_at = null;
    }
    return data;
  };
  const fetchOne = async (id: number, uid: number) => {
    if (name === 'goals') return (await listGoals(uid)).find((g) => g.id === id);
    const db = await getStore();
    const row = await db.get(`SELECT * FROM ${def.table} WHERE id = ? AND user_id = ?`, [id, uid]);
    return row ? num([row])[0] : undefined;
  };

  app.post(`/api/${name}`, wrap(async (req, res) => {
    const db = await getStore();
    const data = normalize(validate(def.schema, req.body));
    const id = await db.insert(
      `INSERT INTO ${def.table} (user_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')}) RETURNING id`,
      [req.userId, ...cols.map((c) => data[c])],
    );
    res.status(201);
    return fetchOne(id, req.userId);
  }));

  app.put(`/api/${name}/:id`, wrap(async (req) => {
    const db = await getStore();
    const id = idParam(req);
    const data = normalize(validate(def.schema, req.body));
    const r = await db.run(
      `UPDATE ${def.table} SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND user_id = ?`,
      [...cols.map((c) => data[c]), id, req.userId],
    );
    if (!r.changes) notFound();
    return fetchOne(id, req.userId);
  }));

  app.delete(`/api/${name}/:id`, wrap(async (req) => {
    const db = await getStore();
    const id = idParam(req);
    const r = await db.run(`DELETE FROM ${def.table} WHERE id = ? AND user_id = ?`, [id, req.userId]);
    if (!r.changes) notFound();
    return { ok: true };
  }));
}

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

// ---------- erros ----------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ValidationError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: 'Dados enviados em formato inválido.' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Algo deu errado no servidor. Tente novamente.' });
});
