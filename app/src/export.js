// Cover Coast — PNG export.
//
// Four post sizes, every one rendered from the same state on its own
// canvas. The file name carries the title as a slug plus the size, so a
// cover shared from the app is already named after itself.

import { makeCoverCanvas } from './cover.js';

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait', width: 1080, height: 1350 },
  { id: 'landscape', label: 'Landscape', width: 1920, height: 1080 },
  { id: 'story', label: 'Story', width: 1080, height: 1920 },
];

export function exportSizeById(id) {
  return EXPORT_SIZES.find((size) => size.id === id) || EXPORT_SIZES[0];
}

// A title as a file-name slug: lower case, anything that is not a letter
// or a digit becomes a dash, edge dashes trimmed, at most 40 characters,
// 'cover' when nothing is left.
export function slugifyTitle(title) {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
  return slug || 'cover';
}

export function exportFileName(title, width, height) {
  return `cover-${slugifyTitle(title)}-${width}x${height}.png`;
}

// Render one size from the live state onto a fresh canvas.
export function renderExportCanvas(state, width, height) {
  return makeCoverCanvas(state, width, height);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Render one size and download it as a PNG (or a JPEG at quality 0.92
// when asked). Returns the file name that was saved.
export async function exportSize(state, size, format = 'png') {
  const canvas = renderExportCanvas(state, size.width, size.height);
  const filename = exportFileName(state.title, size.width, size.height);
  const blob = await new Promise((resolve) => {
    if (format === 'jpeg') {
      canvas.toBlob(resolve, 'image/jpeg', 0.92);
    } else {
      canvas.toBlob(resolve, 'image/png');
    }
  });
  if (blob) downloadBlob(blob, filename);
  return filename;
}

// Render all four sizes in order, calling onProgress after each one
// with (done, total, size). Returns the four file names.
export async function exportAllSizes(state, onProgress) {
  const saved = [];
  for (let index = 0; index < EXPORT_SIZES.length; index++) {
    const size = EXPORT_SIZES[index];
    const filename = await exportSize(state, size);
    saved.push(filename);
    if (typeof onProgress === 'function') {
      onProgress(index + 1, EXPORT_SIZES.length, size);
    }
  }
  return saved;
}
