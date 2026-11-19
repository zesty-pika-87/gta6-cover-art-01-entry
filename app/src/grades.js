// Colour grades as gradient maps: a luminance value is remapped through a ramp
// of shadow -> midtone -> highlight colours, which is what gives a photo the
// Vice City sunset or neon-night look in one pass. The lookup tables are built
// once per grade and cached.
//
// v2: six grades — Golden Hour joins the five v1 grades with a warm amber ramp
// for the new boardwalk daylight photo. The ramp interpolation is now a
// smoothstep instead of linear, so midtones roll off without banding, and
// every grade carries a one-line blurb for the editor chips' tooltips.

export const GRADES = [
  {
    id: 'vice', name: 'Vice Sunset', blurb: 'Purple shadows, hot pink mids, sunset gold',
    stops: [[0, '#160a24'], [0.22, '#5b1a5e'], [0.48, '#c22769'], [0.74, '#ff8a3d'], [1, '#ffd319']],
  },
  {
    id: 'neon', name: 'Neon Nights', blurb: 'Deep blue shadows, violet and cyan glow',
    stops: [[0, '#04041a'], [0.25, '#2b1a6e'], [0.5, '#7b2ff7'], [0.78, '#22d3ee'], [1, '#a5f3fc']],
  },
  {
    id: 'palm', name: 'Palm Dusk', blurb: 'Dusky blue into warm orange and pale gold',
    stops: [[0, '#0e1a2b'], [0.25, '#27395e'], [0.5, '#e8734a'], [0.78, '#f2a65a'], [1, '#f7d774']],
  },
  {
    id: 'magenta', name: 'Magenta Heat', blurb: 'Wine shadows, hot magenta, soft pink highs',
    stops: [[0, '#20001f'], [0.25, '#6d0f4e'], [0.5, '#d81159'], [0.78, '#ff5d8f'], [1, '#ffb3c6']],
  },
  {
    id: 'teal', name: 'Teal Noir', blurb: 'Near-black teal, deep green, pale aqua highs',
    stops: [[0, '#02141a'], [0.25, '#07333d'], [0.5, '#0e7c7b'], [0.78, '#43b8a2'], [1, '#c9f2e4']],
  },
  {
    id: 'gold', name: 'Golden Hour', blurb: 'Warm amber for daylight: brown shadows, gold highs',
    stops: [[0, '#1a0f02'], [0.25, '#7a3b12'], [0.5, '#e8862e'], [0.78, '#ffc53d'], [1, '#fff3b0']],
  },
];

const cache = new Map();

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 256-entry RGB lookup table for a grade id. */
export function gradeLUT(id) {
  if (cache.has(id)) return cache.get(id);
  const grade = GRADES.find((g) => g.id === id) ?? GRADES[0];
  const r = new Uint8Array(256);
  const g = new Uint8Array(256);
  const b = new Uint8Array(256);
  const stops = grade.stops.map(([t, hex]) => [t, hexRgb(hex)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let z = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; z = stops[s + 1]; break; }
    }
    const span = z[0] - a[0] || 1;
    // Smoothstep eases the blend between stops so gradients stay band-free.
    const lin = Math.min(1, Math.max(0, (t - a[0]) / span));
    const f = lin * lin * (3 - 2 * lin);
    r[i] = Math.round(a[1][0] + (z[1][0] - a[1][0]) * f);
    g[i] = Math.round(a[1][1] + (z[1][1] - a[1][1]) * f);
    b[i] = Math.round(a[1][2] + (z[1][2] - a[1][2]) * f);
  }
  const lut = { r, g, b };
  cache.set(id, lut);
  return lut;
}

/**
 * Remaps every pixel of the context's canvas through the grade's lookup table,
 * blended with the original by `intensity` (0 = untouched, 1 = full grade).
 * Runs on the art layer only, so lettering drawn later stays crisp.
 */
export function applyGrade(ctx, W, H, gradeId, intensity) {
  if (intensity <= 0) return;
  const lut = gradeLUT(gradeId);
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const inv = 1 - intensity;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] * 54 + d[i + 1] * 183 + d[i + 2] * 19) >> 8;
    d[i] = d[i] * inv + lut.r[l] * intensity;
    d[i + 1] = d[i + 1] * inv + lut.g[l] * intensity;
    d[i + 2] = d[i + 2] * inv + lut.b[l] * intensity;
  }
  ctx.putImageData(img, 0, 0);
}
