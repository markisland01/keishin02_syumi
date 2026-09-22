import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';
import { createOcrMiddleware } from './ocr-api.mjs';

if (existsSync('.env')) loadEnvFile('.env');
const root = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(resolve(root, 'index.html'))) {
  throw new Error('先に npm run build を実行してください。');
}
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.woff2': 'font/woff2' };

async function serveStatic(req, res) {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }
    let target = resolve(root, `.${pathname}`);
    if ((target !== resolve(root) && !target.startsWith(root.endsWith(sep) ? root : root + sep))
      || pathname.startsWith('/api/') || pathname.split(/[\\/]/).some(part => part.startsWith('.'))) {
      res.writeHead(404).end();
      return;
    }
    let info = await stat(target).catch(() => null);
    if (!info?.isFile()) {
      if (extname(pathname)) { res.writeHead(404).end(); return; }
      target = resolve(root, 'index.html');
      info = await stat(target);
    }
    res.writeHead(200, { 'Content-Type': types[extname(target)] || 'application/octet-stream', 'Content-Length': info.size });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(target).on('error', () => res.destroy()).pipe(res);
  } catch {
    if (!res.headersSent) res.writeHead(400);
    res.end();
  }
}

const ocr = createOcrMiddleware();
const port = Number(process.env.PORT) || 3000;
createServer((req, res) => {
  ocr(req, res, () => serveStatic(req, res)).catch(() => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
}).listen(port, '0.0.0.0', () => console.log(`Server listening on port ${port}`));
