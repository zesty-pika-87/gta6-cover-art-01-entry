// Cover Coast — colour grades.
//
// Each grade is a gradient map: a pixel's brightness is re-mapped through a
// five-stop colour ramp (shadow, two mid-tones, highlight). Between stops
// the ramp blends with a smoothstep, so no hard colour edge ever appears.
// A 256-entry lookup table per grade is built once and cached.
//
// Brightness follows the usual luma weights, about 21% red, 72% green and
// 7% blue. A grade touches only the art layer (the photos); the lettering
// is drawn afterwards, so it stays crisp. Strength 0 leaves the photo
// untouched, strength 1 is the full grade.

export const GRADES = [
  { id: 'vice', name: 'Vice Sunset', blurb: 'Deep purple shadows, hot pink mids, bright gold light.' },
  { id: 'neon', name: 'Neon Nights', blurb: 'Near-black blue shadows, glowing violet and cyan.' },
  { id: 'palm', name: 'Palm Dusk', blurb: 'Gloomy blue shadows, warm orange mids, pale gold light.' },
  { id: 'magenta', name: 'Magenta Heat', blurb: 'Dark wine shadows, searing magenta, soft pink light.' },
  { id: 'teal', name: 'Teal Noir', blurb: 'Almost-black teal shadows, deep green mids, pale aqua light.' },
  { id: 'gold', name: 'Golden Hour', blurb: 'Dark brown shadows, golden orange mids — for daylight photos.' },
];

// Five stops each: [shadow, low mid, high mid, low highlight, highlight].
const RAMPS = {
  vice: [
    [16, 6, 36],
    [92, 16, 88],
    [214, 52, 116],
    [246, 138, 66],
    [255, 214, 132],
  ],
  neon: [
    [6, 10, 40],
    [28, 40, 120],
    [120, 60, 200],
    [40, 220, 230],
    [190, 250, 255],
  ],
  palm: [
    [14, 20, 44],
    [70, 50, 90],
    [200, 90, 60],
    [245, 160, 70],
    [255, 220, 150],
  ],
  magenta: [
    [34, 6, 30],
    [110, 20, 70],
    [210, 40, 130],
    [245, 90, 160],
    [255, 190, 210],
  ],
  teal: [
    [4, 18, 20],
    [10, 60, 64],
    [16, 110, 105],
    [60, 190, 175],
    [180, 245, 230],
  ],
  gold: [
    [40, 24, 12],
    [110, 70, 30],
    [200, 130, 50],
    [240, 180, 80],
    [255, 235, 170],
  ],
};

export function gradeById(id) {
  return GRADES.find((entry) => entry.id === id) || null;
}

function smoothstep(u) {
  const t = Math.max(0, Math.min(1, u));
  return t * t * (3 - 2 * t);
}

// The ramp colour for a brightness t in [0, 1]: find the segment, ease
// across it, lerp the two stops.
function rampColour(ramp, t) {
  const scaled = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  const segment = Math.min(ramp.length - 2, Math.floor(scaled));
  const local = smoothstep(scaled - segment);
  const from = ramp[segment];
  const to = ramp[segment + 1];
  return [
    Math.round(from[0] + (to[0] - from[0]) * local),
    Math.round(from[1] + (to[1] - from[1]) * local),
    Math.round(from[2] + (to[2] - from[2]) * local),
  ];
}

const lutCache = new Map();

// The 256-entry lookup table for a grade: index = brightness, value = colour.
export function gradeLookupTable(id) {
  const key = RAMPS[id] ? id : 'vice';
  if (!lutCache.has(key)) {
    const ramp = RAMPS[key];
    const table = new Array(256);
    for (let level = 0; level < 256; level++) {
      table[level] = rampColour(ramp, level / 255);
    }
    lutCache.set(key, table);
  }
  return lutCache.get(key);
}

// Re-map every pixel of an ImageData through the grade, mixed with the
// original photo by strength (0 = unchanged, 1 = full grade).
export function applyGrade(imageData, id, strength) {
  const amount = Math.max(0, Math.min(1, strength));
  if (amount === 0) return imageData;
  const table = gradeLookupTable(id);
  const pixels = imageData.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    const brightness = Math.round(red * 0.21 + green * 0.72 + blue * 0.07);
    const graded = table[Math.max(0, Math.min(255, brightness))];
    pixels[i] = Math.round(red + (graded[0] - red) * amount);
    pixels[i + 1] = Math.round(green + (graded[1] - green) * amount);
    pixels[i + 2] = Math.round(blue + (graded[2] - blue) * amount);
  }
  return imageData;
}
