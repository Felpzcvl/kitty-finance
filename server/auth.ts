import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getStore } from './db.ts';

const TOKEN_DAYS = 30;

/** Chave de assinatura das sessões: gerada uma vez e guardada no próprio banco. */
let secretPromise: Promise<Buffer> | null = null;
function getSecret(): Promise<Buffer> {
  secretPromise ??= (async () => {
    const db = await getStore();
    await db.run('INSERT INTO app_meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', [
      'session_secret',
      crypto.randomBytes(48).toString('base64'),
    ]);
    const row = await db.get('SELECT value FROM app_meta WHERE key = ?', ['session_secret']);
    return Buffer.from(String(row!.value), 'base64');
  })().catch((err) => {
    secretPromise = null;
    throw err;
  });
  return secretPromise;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(password, Buffer.from(saltB64, 'base64'), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

async function sign(data: string): Promise<string> {
  return crypto.createHmac('sha256', await getSecret()).update(data).digest('base64url');
}

export async function createToken(userId: number): Promise<string> {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, exp: Date.now() + TOKEN_DAYS * 86_400_000 }),
  ).toString('base64url');
  return `${payload}.${await sign(payload)}`;
}

export async function readToken(token: string): Promise<number | null> {
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = await sign(payload);
  if (expected.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof uid !== 'number' || typeof exp !== 'number' || exp < Date.now()) return null;
    return uid;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  userId: number;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const uid = token ? await readToken(token) : null;
    if (!uid) {
      res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
      return;
    }
    (req as AuthedRequest).userId = uid;
    next();
  } catch (err) {
    next(err);
  }
}

/** Limite simples de tentativas de login por IP (10 por 10 minutos). */
const attempts = new Map<string, { count: number; reset: number }>();
export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? 'local';
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset < now) {
    attempts.set(key, { count: 1, reset: now + 10 * 60_000 });
    return next();
  }
  entry.count++;
  if (entry.count > 10) {
    res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' });
    return;
  }
  next();
}
