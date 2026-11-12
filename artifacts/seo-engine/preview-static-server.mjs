import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const root = resolve(import.meta.dirname, 'public');
const port = Number(process.env.PORT || 3000);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.json': 'application/json' };

createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  if (pathname.startsWith('/api/')) { res.writeHead(404, { 'Cache-Control': 'no-store' }); res.end(); return; }
  const candidate = resolve(root, '.' + pathname);
  if (candidate !== root && !candidate.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  let file = candidate;
  try { if (!(await stat(file)).isFile()) file = resolve(root, 'index.html'); }
  catch { file = resolve(root, 'index.html'); }
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': file.endsWith('index.html') ? 'no-store' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404); res.end(); }
}).listen(port, '0.0.0.0', () => console.log('Customer preview static server listening on', port));
