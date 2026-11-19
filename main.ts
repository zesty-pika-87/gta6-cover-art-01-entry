// main.ts — the Cover Coast entrypoint (Node 22, standard library only).
//
// Hands the entry in: copies app/ and screenshots/ from beside this file
// to the output directory (MAKEFUN_OUTPUT_DIR, default /output) and writes
// /output/dossier.json with buildDossier from ./vendor/makefun-app.ts.
//
// Preflight (the scorer's own caps, reference/gate.json): there must be
// exactly 4 screenshots, each at most 256 KiB, and each one's long side at
// most 1280 px with its short side at least 480 px — checked by parsing
// the PNG IHDR header or the JPEG SOF0/SOF2 header. The copied app/ tree
// is checked too (no symlinks, at most 993 entries and 48 MiB, index.html
// at most 1 MiB). A bundle that would be refused is never handed in: the
// run fails with a clear message.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 262144;
const MAX_LONG_SIDE = 1280;
const MIN_SHORT_SIDE = 480;

function fail(message) {
  throw new Error(`Cover Coast preflight: ${message}`);
}

function pngSize(buffer) {
  if (buffer.length < 24 || buffer.readUInt32BE(0) !== 0x89504e47) return null;
  if (buffer.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function jpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = buffer.readUInt16BE(offset + 2);
    if (marker === 0xc0 || marker === 0xc2) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function checkScreenshots(dir) {
  if (!existsSync(dir)) fail('screenshots/ is missing');
  const names = readdirSync(dir).filter((name) => !name.startsWith('.')).sort();
  if (names.length !== MAX_SCREENSHOTS) {
    fail(`expected exactly ${MAX_SCREENSHOTS} screenshots, found ${names.length}`);
  }
  for (const name of names) {
    const path = join(dir, name);
    const size = statSync(path).size;
    if (size > MAX_SCREENSHOT_BYTES) {
      fail(`${name} is ${size} bytes, over the 256 KiB cap`);
    }
    const buffer = readFileSync(path);
    const dimensions = pngSize(buffer) ?? jpegSize(buffer);
    if (!dimensions) fail(`${name} is neither a whole PNG nor a whole JPEG`);
    const longSide = Math.max(dimensions.width, dimensions.height);
    const shortSide = Math.min(dimensions.width, dimensions.height);
    if (longSide > MAX_LONG_SIDE) {
      fail(`${name} is ${dimensions.width}x${dimensions.height}, long side over ${MAX_LONG_SIDE}`);
    }
    if (shortSide < MIN_SHORT_SIDE) {
      fail(`${name} is ${dimensions.width}x${dimensions.height}, short side under ${MIN_SHORT_SIDE}`);
    }
  }
}

// The scorer's app_files row, checked on the copied tree that is actually
// handed in: plain files and directories only (no symlinks), at most 993
// entries and 48 MiB in all, every path at most 1000 bytes, and
// app/index.html a regular file of at most 1 MiB.
function checkAppTree(dir) {
  const MAX_APP_FILES = 993;
  const MAX_APP_BYTES = 50331648;
  const MAX_INDEX_BYTES = 1048576;
  let entries = 0;
  let bytes = 0;
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      const info = lstatSync(path);
      entries += 1;
      if (Buffer.byteLength(path, 'utf8') > 1000) fail(`path over 1000 bytes: ${path}`);
      if (info.isSymbolicLink()) fail(`symlink in app/: ${path}`);
      if (info.isDirectory()) walk(path);
      else if (info.isFile()) bytes += info.size;
      else fail(`not a plain file or directory: ${path}`);
    }
  };
  walk(dir);
  if (entries > MAX_APP_FILES) fail(`app/ has ${entries} entries, over the 993 cap`);
  if (bytes > MAX_APP_BYTES) fail(`app/ is ${bytes} bytes, over the 48 MiB cap`);
  const index = join(dir, 'index.html');
  if (!existsSync(index) || !statSync(index).isFile()) fail('app/index.html is missing');
  if (statSync(index).size > MAX_INDEX_BYTES) fail('app/index.html is over the 1 MiB cap');
}

checkScreenshots(join(here, 'screenshots'));

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}
checkAppTree(join(out, 'app'));

writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
