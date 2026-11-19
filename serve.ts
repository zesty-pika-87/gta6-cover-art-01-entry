// Cover Coast — a tiny static server for app/.
//
// Serves the app folder on 127.0.0.1:8080 by default, so the cover maker
// can be tried in a desktop browser with no build step:
//   node serve.ts
//   open http://localhost:8080
//
// Flags: --port <number>, --host <address>. Paths that escape the app
// folder are refused with 403, missing files answer 404, every request
// is logged to stderr with its status, HEAD answers headers only, and
// responses carry Cache-Control: no-store so a fresh build is never
// hidden behind a stale copy.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIME_TYPES = {
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

function parseFlags(argv) {
  const flags = { port: 8080, host: '127.0.0.1' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port' && argv[i + 1]) {
      flags.port = Number(argv[i + 1]);
      i++;
    } else if (argv[i] === '--host' && argv[i + 1]) {
      flags.host = argv[i + 1];
      i++;
    }
  }
  return flags;
}

function mimeFor(filePath) {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const cwdApp = resolve(process.cwd(), 'app');
const scriptDir = resolve(fileURLToPath(new URL('.', import.meta.url)));
const root = existsSync(cwdApp) ? cwdApp : resolve(scriptDir, 'app');

const { port, host } = parseFlags(process.argv.slice(2));

const server = createServer(async (request, response) => {
  const method = request.method || 'GET';
  const url = new URL(request.url || '/', `http://${host}:${port}`);
  const decoded = decodeURIComponent(url.pathname);
  const target = normalize(join(root, decoded === '/' ? 'index.html' : decoded));
  const inside = target === root || target.startsWith(root + sep);

  const log = (status) => {
    process.stderr.write(`${method} ${url.pathname} ${status}\n`);
  };

  if (!inside) {
    response.writeHead(403, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('Forbidden\n');
    log(403);
    return;
  }

  let info;
  try {
    info = await stat(target);
  } catch {
    info = null;
  }
  if (!info || !info.isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('Not found\n');
    log(404);
    return;
  }

  try {
    const body = await readFile(target);
    const headers = {
      'content-type': mimeFor(target),
      'content-length': body.length,
      'cache-control': 'no-store',
    };
    response.writeHead(200, headers);
    if (method === 'HEAD') {
      response.end();
    } else {
      response.end(body);
    }
    log(200);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    response.end('Server error\n');
    log(500);
    process.stderr.write(`${String(error)}\n`);
  }
});

server.listen(port, host, () => {
  process.stderr.write(`Cover Coast serving ${root} at http://${host}:${port}/\n`);
});
