// Export: renders the current state at each post size and downloads the PNG.
// Every size is rendered from the same state, so the square, the portrait and
// the landscape covers always match.
//
// v2: filenames carry a slug of the cover title (cover-sunset-heist-1080x1080.png
// instead of cover-1080x1080.png), exportAll reports progress through an
// optional callback so the status line can count up, and renderImage takes a
// format so a JPEG proof can be rendered without touching the PNG path.

import { renderCover } from './cover.js';

export const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
  { id: '1080x1920', w: 1080, h: 1920, label: 'Story 1080 x 1920' },
];

/** "Sunset Heist!" -> "sunset-heist"; falls back to "cover" for empty titles. */
export function slugifyTitle(title) {
  const slug = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'cover';
}

/**
 * Renders `state` at W x H and resolves to an image blob.
 * format is 'png' (default) or 'jpeg' with a quality 0..1.
 */
export function renderImage(state, w, h, format = 'png', quality = 0.92) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, state);
  const type = format === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Renders `state` at W x H and resolves to a PNG blob. */
export function renderPNG(state, w, h) {
  return renderImage(state, w, h, 'png');
}

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

/** Exports one size as cover-<title>-<WxH>.png. Returns the filename. */
export async function exportCover(state, size) {
  const blob = await renderPNG(state, size.w, size.h);
  const filename = `cover-${slugifyTitle(state.title)}-${size.w}x${size.h}.png`;
  download(blob, filename);
  return filename;
}

/**
 * Exports all four sizes, one click. `onProgress(done, total, name)` is
 * called after each size so the UI can count up. Returns the filenames.
 */
export async function exportAll(state, onProgress) {
  const names = [];
  for (const size of SIZES) {
    const name = await exportCover(state, size);
    names.push(name);
    if (onProgress) onProgress(names.length, SIZES.length, name);
  }
  return names;
}
