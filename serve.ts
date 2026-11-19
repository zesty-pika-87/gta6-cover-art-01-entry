// serve.ts — a tiny static server for the Cover Coast app/ folder.
//
// Serves app/ on 127.0.0.1:8080 (`node serve.ts`, then open
// http://localhost:8080). Node 22, standard library only. Flags:
//   --port <n>   listen port (default 8080)
//   --host <h>   listen host (default 127.0.0.1)
//
// Paths that escape the app root are refused with 403, missing files get
// 404, every request is logged to stderr with its status, HEAD answers
// with headers only, and responses carry `cache-control: no-store`.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

const here = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(join(here, 'app'));

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const at = args.indexOf(name);
  return at >= 0 && args[at + 1] ? args[at + 1] : fallback;
}
const port = Number(flagValue('--port', '8080'));
const host = flagValue('--host', '127.0.0.1');

const server = createServer((req, res) => {
  const rawPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  const joined = resolve(join(root, normalize(rawPath).replace(/^(\.\.[/\\])+/, '')));
  const inside = joined === root || joined.startsWith(root + sep);
  const log = (status) => console.error(`${req.method} ${rawPath} ${status}`);
  if (!inside) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('403 forbidden\n');
    log(403);
    return;
  }
  let target = joined;
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
  if (!existsSync(target) || !statSync(target).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end('404 not found\n');
    log(404);
    return;
  }
  const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
  const headers = { 'content-type': type, 'cache-control': 'no-store' };
  if (req.method === 'HEAD') {
    res.writeHead(200, headers);
    res.end();
    log(200);
    return;
  }
  res.writeHead(200, headers);
  createReadStream(target).pipe(res);
  log(200);
});

server.listen(port, host, () => {
  console.error(`Cover Coast serving ${root} at http://${host}:${port}`);
});
