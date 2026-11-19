// Export: renders the current state at each post size and downloads the PNG.
// Every size is rendered from the same state, so the square, the portrait and
// the landscape covers always match.

import { renderCover } from './cover.js';

export const SIZES = [
  { id: '1080x1080', w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  { id: '1080x1350', w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  { id: '1920x1080', w: 1920, h: 1080, label: 'Landscape 1920 x 1080' },
  { id: '1080x1920', w: 1080, h: 1920, label: 'Story 1080 x 1920' },
];

/** Renders `state` at W x H and resolves to a PNG blob. */
export function renderPNG(state, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  renderCover(canvas, state);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
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

/** Exports one size as cover-<WxH>.png. Returns the filename. */
export async function exportCover(state, size) {
  const blob = await renderPNG(state, size.w, size.h);
  const filename = `cover-${size.w}x${size.h}.png`;
  download(blob, filename);
  return filename;
}

/** Exports all four sizes, one click. Returns the filenames. */
export async function exportAll(state) {
  const names = [];
  for (const size of SIZES) {
    names.push(await exportCover(state, size));
  }
  return names;
}
