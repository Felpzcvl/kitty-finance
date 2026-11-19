// Monta a saída da Vercel (Build Output API v3):
//   .vercel/output/static            → app React compilado (dist)
//   .vercel/output/functions/api.func → API Express empacotada numa função Node
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '.vercel', 'output');
const fn = path.join(out, 'functions', 'api.func');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(fn, { recursive: true });

// 1) site estático
fs.cpSync(path.join(root, 'dist'), path.join(out, 'static'), { recursive: true });

// 2) função da API
await build({
  entryPoints: [path.join(root, 'server', 'vercel.ts')],
  outfile: path.join(fn, 'index.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  external: ['pg-native', 'node:sqlite'],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  logLevel: 'info',
});

fs.writeFileSync(
  path.join(fn, '.vc-config.json'),
  JSON.stringify({ runtime: 'nodejs22.x', handler: 'index.mjs', launcherType: 'Nodejs', shouldAddHelpers: false, maxDuration: 30 }, null, 2),
);
fs.writeFileSync(path.join(fn, 'package.json'), JSON.stringify({ type: 'module' }));

// 3) rotas: /api/* → função; arquivos estáticos; resto → index.html (SPA)
fs.writeFileSync(
  path.join(out, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '^/api(?:/.*)?$', dest: '/api' },
        { handle: 'filesystem' },
        { src: '^/assets/(.*)$', headers: { 'cache-control': 'public, max-age=31536000, immutable' }, continue: true },
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('✓ Saída da Vercel pronta em .vercel/output');
