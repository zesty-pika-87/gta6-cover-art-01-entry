// Cover Coast — the entrypoint.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes dossier.json there, built by buildDossier from
// vendor/makefun-app.ts. Run it from the repository root:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory defaults to /output when MAKEFUN_OUTPUT_DIR is
// not set. The program runs twice over the same inputs and writes the
// same bytes both times.
//
// Preflight: the screenshots must be exactly 4, each at most 256 KiB,
// each a readable PNG or JPEG with its long side at most 1280 px and
// its short side at least 480 px — anything else fails loudly instead
// of handing in a bundle the gate would refuse.

import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 256 * 1024;
const MAX_SCREENSHOT_LONG_SIDE = 1280;
const MIN_SCREENSHOT_SHORT_SIDE = 480;
const TEXT_MAX_BYTES = 163840;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const APP_PATH_MAX_BYTES = 1000;

// Dimensions of a PNG from its IHDR chunk, or null when not a PNG.
function pngDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return null;
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

// Dimensions of a JPEG by scanning its markers for a start-of-frame
// segment, or null when not a JPEG or no frame is found.
function jpegDimensions(bytes: Buffer): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd9 || marker === 0xda) break;
    const length = bytes.readUInt16BE(offset + 2);
    if (length < 2) break;
    if (marker === 0xc0 || marker === 0xc2) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

async function checkScreenshots(screenshotsDir) {
  const names = (await readdir(screenshotsDir)).filter((name) => !name.startsWith('.')).sort();
  if (names.length !== MAX_SCREENSHOTS) {
    throw new Error(
      `Preflight failed: screenshots/ holds ${names.length} image(s), expected exactly ${MAX_SCREENSHOTS}.`,
    );
  }
  for (const name of names) {
    const path = join(screenshotsDir, name);
    const info = await stat(path);
    if (!info.isFile()) {
      throw new Error(`Preflight failed: screenshots/${name} is not a regular file.`);
    }
    if (info.size > MAX_SCREENSHOT_BYTES) {
      throw new Error(
        `Preflight failed: screenshots/${name} is ${info.size} bytes, over the ${MAX_SCREENSHOT_BYTES} byte cap.`,
      );
    }
    const bytes = await readFile(path);
    const dims = pngDimensions(bytes) ?? jpegDimensions(bytes);
    if (!dims) {
      throw new Error(`Preflight failed: screenshots/${name} is not a readable PNG or JPEG.`);
    }
    const longSide = Math.max(dims.width, dims.height);
    const shortSide = Math.min(dims.width, dims.height);
    if (longSide > MAX_SCREENSHOT_LONG_SIDE) {
      throw new Error(
        `Preflight failed: screenshots/${name} is ${dims.width}x${dims.height}, ` +
          `long side over the ${MAX_SCREENSHOT_LONG_SIDE} px cap.`,
      );
    }
    if (shortSide < MIN_SCREENSHOT_SHORT_SIDE) {
      throw new Error(
        `Preflight failed: screenshots/${name} is ${dims.width}x${dims.height}, ` +
          `short side under the ${MIN_SCREENSHOT_SHORT_SIDE} px minimum.`,
      );
    }
  }
  return names;
}

async function main() {
  const repoRoot = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(join(repoRoot, 'app'), join(outDir, 'app'), { recursive: true });
  await cp(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

  const shotNames = await checkScreenshots(join(outDir, 'screenshots'));

  const dossier = buildDossier(outDir, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: { max: MAX_SCREENSHOTS, max_bytes: MAX_SCREENSHOT_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
    app_path_max_bytes: APP_PATH_MAX_BYTES,
  });
  await writeFile(join(outDir, 'dossier.json'), dossier);

  process.stdout.write(
    `Cover Coast: wrote ${outDir}/dossier.json (${dossier.length} bytes) ` +
      `from app/ and ${shotNames.length} screenshots.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`Cover Coast failed: ${error.message}\n`);
  process.exitCode = 1;
});
