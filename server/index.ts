// Servidor local: API + app compilado (se existir a pasta dist).
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { app } from './app.ts';
import { getStore, usingPostgres } from './db.ts';

const PORT = Number(process.env.KF_PORT ?? 3333);

const dist = path.resolve(import.meta.dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

await getStore();
app.listen(PORT, '127.0.0.1', () => {
  console.log(`♥ Kitty Finance em http://localhost:${PORT} (banco: ${usingPostgres ? 'Postgres' : 'SQLite local'})`);
});
