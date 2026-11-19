// export.js — PNG export in the four common post sizes.
//
// Each size renders the same state onto a fresh canvas, so the export is
// exactly the cover the preview shows, at full resolution. File names come
// from the title: cover-<slug>-<WIDTH>x<HEIGHT>.png. Export-all renders
// the four sizes in order and reports progress after each one.

import { renderCover } from './cover.js';

export const EXPORT_SIZES = {
  '1080x1080': { width: 1080, height: 1080, label: 'Square 1080 × 1080' },
  '1080x1350': { width: 1080, height: 1350, label: 'Portrait 1080 × 1350' },
  '1920x1080': { width: 1920, height: 1080, label: 'Landscape 1920 × 1080' },
  '1080x1920': { width: 1080, height: 1920, label: 'Story 1080 × 1920' },
};

export const EXPORT_SIZE_KEYS = Object.keys(EXPORT_SIZES);

export function slugifyTitle(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || 'cover';
}

export function exportFileName(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  return `cover-${slugifyTitle(state.title)}-${size.width}x${size.height}.png`;
}

function renderSizeCanvas(state, sizeKey) {
  const size = EXPORT_SIZES[sizeKey];
  const canvas = document.createElement('canvas');
  renderCover(canvas, state, { width: size.width, height: size.height });
  return canvas;
}

function canvasToBlob(canvas, format) {
  return new Promise((resolve, reject) => {
    const type = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpeg' ? 0.92 : undefined;
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas export produced no blob'));
    }, type, quality);
  });
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Render one size and download it as a PNG (or JPEG at quality 0.92).
export async function exportPng(state, sizeKey, format = 'png') {
  const canvas = renderSizeCanvas(state, sizeKey);
  const blob = await canvasToBlob(canvas, format);
  const extension = format === 'jpeg' ? 'jpg' : 'png';
  const fileName = exportFileName(state, sizeKey).replace(/\.png$/, `.${extension}`);
  downloadBlob(blob, fileName);
  return fileName;
}

// Render all four sizes in order, calling onProgress after each one with
// (done, total, fileName). Returns the list of file names.
export async function exportAllSizes(state, onProgress) {
  const names = [];
  for (let i = 0; i < EXPORT_SIZE_KEYS.length; i++) {
    const key = EXPORT_SIZE_KEYS[i];
    const name = await exportPng(state, key);
    names.push(name);
    if (onProgress) onProgress(i + 1, EXPORT_SIZE_KEYS.length, name);
  }
  return names;
}
