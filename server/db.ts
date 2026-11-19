/*
 * Camada de banco com dois motores:
 *  - Postgres quando existir DATABASE_URL (ou POSTGRES_URL) — usado na Vercel;
 *  - SQLite local (arquivo data/kitty-finance.db) — usado na máquina.
 * As consultas usam "?" como marcador; no Postgres eles viram $1, $2…
 */
import path from 'node:path';
import fs from 'node:fs';

export type Row = Record<string, unknown>;
export type Param = string | number | null;

export interface Store {
  all(sql: string, params?: Param[]): Promise<Row[]>;
  get(sql: string, params?: Param[]): Promise<Row | undefined>;
  run(sql: string, params?: Param[]): Promise<{ changes: number }>;
  /** INSERT … RETURNING id */
  insert(sql: string, params?: Param[]): Promise<number>;
  tx<T>(fn: (s: Store) => Promise<T>): Promise<T>;
  dialect: 'pg' | 'sqlite';
}

const PG_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

const SCHEMA = (pg: boolean) => {
  const id = pg ? 'BIGSERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const ref = pg ? 'BIGINT' : 'INTEGER';
  const money = pg ? 'BIGINT' : 'INTEGER';
  const now = pg ? 'TIMESTAMPTZ NOT NULL DEFAULT now()' : "TEXT NOT NULL DEFAULT (datetime('now'))";
  return `
  CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

  CREATE TABLE IF NOT EXISTS users (
    id ${id},
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar TEXT,
    settings TEXT NOT NULL DEFAULT '{}',
    is_demo INTEGER NOT NULL DEFAULT 0,
    created_at ${now}
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id ${id},
    user_id ${ref} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount ${money} NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    method TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    created_at ${now}
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id ${id},
    user_id ${ref} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount ${money} NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pago',
    notes TEXT NOT NULL DEFAULT '',
    created_at ${now}
  );

  CREATE TABLE IF NOT EXISTS bills (
    id ${id},
    user_id ${ref} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount ${money} NOT NULL,
    due_date TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente',
    paid_at TEXT,
    recurrence TEXT NOT NULL DEFAULT 'nenhuma',
    notes TEXT NOT NULL DEFAULT '',
    created_at ${now}
  );

  CREATE TABLE IF NOT EXISTS goals (
    id ${id},
    user_id ${ref} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target ${money} NOT NULL,
    deadline TEXT,
    icon TEXT NOT NULL DEFAULT 'heart',
    color TEXT NOT NULL DEFAULT 'rosa',
    created_at ${now}
  );

  CREATE TABLE IF NOT EXISTS goal_deposits (
    id ${id},
    user_id ${ref} NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id ${ref} NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    amount ${money} NOT NULL,
    date TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at ${now}
  );

  CREATE INDEX IF NOT EXISTS idx_incomes_user  ON incomes(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_bills_user    ON bills(user_id, due_date);
  CREATE INDEX IF NOT EXISTS idx_goals_user    ON goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_deposits_goal ON goal_deposits(goal_id);
`;
};

const toPg = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

async function createPgStore(url: string): Promise<Store> {
  const pg = (await import('pg')).default;
  pg.types.setTypeParser(20, (v: string) => Number(v)); // BIGINT → number
  pg.types.setTypeParser(1700, (v: string) => Number(v)); // NUMERIC → number
  const pool = new pg.Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 });

  type Q = { query: (sql: string, params?: Param[]) => Promise<{ rows: Row[]; rowCount: number | null }> };
  const make = (q: Q): Omit<Store, 'tx' | 'dialect'> => ({
    all: async (sql, params = []) => (await q.query(toPg(sql), params)).rows,
    get: async (sql, params = []) => (await q.query(toPg(sql), params)).rows[0],
    run: async (sql, params = []) => ({ changes: (await q.query(toPg(sql), params)).rowCount ?? 0 }),
    insert: async (sql, params = []) => Number((await q.query(toPg(sql), params)).rows[0].id),
  });

  const store: Store = {
    ...make(pool as unknown as Q),
    dialect: 'pg',
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const inner: Store = { ...make(client as unknown as Q), dialect: 'pg', tx: (f) => f(inner) };
        const result = await fn(inner);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
  };
  try {
    await pool.query(SCHEMA(true));
  } catch (err) {
    // duas instâncias criando as tabelas ao mesmo tempo: a outra já criou
    const code = (err as { code?: string }).code;
    if (code !== '23505' && code !== '42P07') throw err;
  }
  return store;
}

async function createSqliteStore(): Promise<Store> {
  const { DatabaseSync } = await import('node:sqlite');
  const dir = path.resolve(import.meta.dirname, '..', 'data');
  fs.mkdirSync(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, 'kitty-finance.db'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA(false));

  // fila simples: uma transação por vez (SQLite tem uma conexão só)
  let queue: Promise<unknown> = Promise.resolve();

  const base: Omit<Store, 'tx' | 'dialect'> = {
    all: async (sql, params = []) => db.prepare(sql).all(...params) as Row[],
    get: async (sql, params = []) => db.prepare(sql).get(...params) as Row | undefined,
    run: async (sql, params = []) => ({ changes: Number(db.prepare(sql).run(...params).changes) }),
    insert: async (sql, params = []) => Number((db.prepare(sql).get(...params) as Row).id),
  };
  const store: Store = {
    ...base,
    dialect: 'sqlite',
    tx: (fn) => {
      const next = queue.then(async () => {
        db.exec('BEGIN');
        try {
          const inner: Store = { ...base, dialect: 'sqlite', tx: (f) => f(inner) };
          const r = await fn(inner);
          db.exec('COMMIT');
          return r;
        } catch (err) {
          db.exec('ROLLBACK');
          throw err;
        }
      });
      queue = next.catch(() => undefined);
      return next;
    },
  };
  return store;
}

let storePromise: Promise<Store> | null = null;
export function getStore(): Promise<Store> {
  storePromise ??= (PG_URL ? createPgStore(PG_URL) : createSqliteStore()).catch((err) => {
    storePromise = null;
    throw err;
  });
  return storePromise;
}

export const usingPostgres = Boolean(PG_URL);
