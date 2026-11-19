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
// Preflight: the screenshots must be exactly 4, each at most 256 KiB —
// anything else fails loudly instead of handing in a bundle the gate
// would refuse.

import { cp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const MAX_SCREENSHOTS = 4;
const MAX_SCREENSHOT_BYTES = 256 * 1024;
const TEXT_MAX_BYTES = 163840;
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 48 * 1024 * 1024;
const APP_PATH_MAX_BYTES = 1000;

async function checkScreenshots(screenshotsDir) {
  const names = (await readdir(screenshotsDir)).filter((name) => !name.startsWith('.')).sort();
  if (names.length !== MAX_SCREENSHOTS) {
    throw new Error(
      `Preflight failed: screenshots/ holds ${names.length} image(s), expected exactly ${MAX_SCREENSHOTS}.`,
    );
  }
  for (const name of names) {
    const info = await stat(join(screenshotsDir, name));
    if (!info.isFile()) {
      throw new Error(`Preflight failed: screenshots/${name} is not a regular file.`);
    }
    if (info.size > MAX_SCREENSHOT_BYTES) {
      throw new Error(
        `Preflight failed: screenshots/${name} is ${info.size} bytes, over the ${MAX_SCREENSHOT_BYTES} byte cap.`,
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
