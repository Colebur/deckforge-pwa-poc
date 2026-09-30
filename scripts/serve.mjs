import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { mediaResponse } from '../dist/media.js';
const root = resolve('dist');
const port = Number(process.env.PORT || 4173);
const base = process.env.POC_BASE_PATH || '/';
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('POC_BASE_PATH must start and end with /');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.wav':'audio/wav'};
createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    const incoming = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!incoming.startsWith(base)) { res.writeHead(404); res.end('Not found'); return; }
    const pathname = '/' + incoming.slice(base.length);
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const data = await readFile(file);
    const headers = {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'};
    if (extname(file) === '.wav' && req.headers.range) {
      const partial = await mediaResponse(new Response(data, {headers}), req.headers.range);
      res.writeHead(partial.status, Object.fromEntries(partial.headers));
      res.end(req.method === 'HEAD' ? undefined : Buffer.from(await partial.arrayBuffer()));
    } else {
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : data);
    }
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`DeckForge PWA: http://localhost:${port}${base}\nKeep this window open. Stop with Control–C. Only the built PWA files are served.`));
