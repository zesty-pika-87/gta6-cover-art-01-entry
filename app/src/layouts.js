// Cover Coast — cover layouts.
//
// Every layout is a pure function of the canvas size: it hands back the
// photo panels, the title box and whether the title needs a scrim behind
// it. All coordinates are pixels, so one description serves the preview
// canvas and every export size alike.
//
// A panel is { x, y, w, h, rot, framed, dim }:
//   x, y, w, h — the panel's box on the canvas
//   rot        — rotation in radians about the panel's centre (0 = straight)
//   framed     — draw it as a tilted polaroid snapshot, cream frame included
//   dim        — dim the photo (a backdrop panel under other panels)
// A title box is { x, y, w, h, align, band }:
//   align — 'left' or 'center'
//   band  — true when the title owns a band of its own at the foot;
//           false when it sits on top of the photos over a scrim.

export const LAYOUTS = [
  { id: 'fullbleed', name: 'Full Bleed', blurb: 'One photo edge to edge, title low on the left.' },
  { id: 'four', name: 'Four Panel', blurb: 'A 2 by 2 grid with a centred title at the foot.' },
  { id: 'hero3', name: 'Hero + Three', blurb: 'A tall hero on the left, three stacked panels right.' },
  { id: 'grid9', name: 'Nine Panel', blurb: 'A 3 by 3 grid over a bold title band.' },
  { id: 'mosaic', name: 'Mosaic Nine', blurb: 'A tall hero plus cinematic strips, title band below.' },
  { id: 'tilted', name: 'Tilted Snapshots', blurb: 'Polaroids scattered over a dimmed backdrop.' },
  { id: 'story', name: 'Story Stack', blurb: 'A wide top panel, two below, title band at the foot.' },
];

export function layoutById(id) {
  return LAYOUTS.find((entry) => entry.id === id) || null;
}

// The gap between panels: at least 2 px, or 1.2% of the canvas's short side.
export function panelGutter(width, height) {
  return Math.max(2, Math.round(Math.min(width, height) * 0.012));
}

function gridPanels(area, cols, rows, gutter) {
  const cells = [];
  const cellW = (area.w - gutter * (cols - 1)) / cols;
  const cellH = (area.h - gutter * (rows - 1)) / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        x: area.x + col * (cellW + gutter),
        y: area.y + row * (cellH + gutter),
        w: cellW,
        h: cellH,
        rot: 0,
        framed: false,
      });
    }
  }
  return cells;
}

function titleBand(width, height, topFraction) {
  return {
    x: 0,
    y: height * topFraction,
    w: width,
    h: height * (1 - topFraction),
    align: 'center',
    band: true,
  };
}

function fullBleedPanels(width, height) {
  return {
    panels: [{ x: 0, y: 0, w: width, h: height, rot: 0, framed: false }],
    title: { x: width * 0.05, y: height * 0.66, w: width * 0.9, h: height * 0.28, align: 'left', band: false },
    scrim: true,
  };
}

function fourPanelPanels(width, height, gutter) {
  return {
    panels: gridPanels({ x: gutter, y: gutter, w: width - 2 * gutter, h: height - 2 * gutter }, 2, 2, gutter),
    title: { x: width * 0.05, y: height * 0.7, w: width * 0.9, h: height * 0.28, align: 'center', band: false },
    scrim: true,
  };
}

function heroThreePanels(width, height, gutter) {
  const heroW = width * 0.64 - gutter * 1.5;
  const rightX = width * 0.64 + gutter * 0.5;
  const rightW = width - gutter - rightX;
  const right = gridPanels({ x: rightX, y: gutter, w: rightW, h: height - 2 * gutter }, 1, 3, gutter);
  return {
    panels: [{ x: gutter, y: gutter, w: heroW, h: height - 2 * gutter, rot: 0, framed: false }, ...right],
    title: { x: gutter, y: height * 0.72, w: width * 0.58, h: height * 0.26, align: 'left', band: false },
    scrim: true,
  };
}

function ninePanelPanels(width, height, gutter) {
  const panels = gridPanels(
    { x: gutter, y: gutter, w: width - 2 * gutter, h: height * 0.78 - 2 * gutter },
    3,
    3,
    gutter,
  );
  return { panels, title: titleBand(width, height, 0.78), scrim: false };
}

function mosaicNinePanels(width, height, gutter) {
  const heroW = width * 0.4 - gutter * 1.5;
  const rightX = width * 0.4 + gutter * 0.5;
  const rightW = width - gutter - rightX;
  const strips = gridPanels(
    { x: rightX, y: gutter, w: rightW, h: height * 0.78 - 2 * gutter },
    2,
    4,
    gutter,
  );
  const panels = [{ x: gutter, y: gutter, w: heroW, h: height * 0.78 - 2 * gutter, rot: 0, framed: false }, ...strips];
  return { panels, title: titleBand(width, height, 0.78), scrim: false };
}

function tiltedSnapshotPanels(width, height) {
  return {
    panels: [
      { x: 0, y: 0, w: width, h: height, rot: 0, framed: false, dim: true },
      { x: width * 0.06, y: height * 0.05, w: width * 0.3, h: height * 0.34, rot: 0.07, framed: true },
      { x: width * 0.3, y: height * 0.2, w: width * 0.42, h: height * 0.48, rot: -0.05, framed: true },
      { x: width * 0.62, y: height * 0.52, w: width * 0.3, h: height * 0.34, rot: 0.08, framed: true },
    ],
    title: { x: width * 0.05, y: height * 0.76, w: width * 0.62, h: height * 0.22, align: 'left', band: false },
    scrim: true,
  };
}

function storyStackPanels(width, height, gutter) {
  const bottomW = (width - 3 * gutter) / 2;
  return {
    panels: [
      { x: gutter, y: gutter, w: width - 2 * gutter, h: height * 0.52 - 2 * gutter, rot: 0, framed: false },
      { x: gutter, y: height * 0.53, w: bottomW, h: height * 0.2, rot: 0, framed: false },
      { x: gutter + bottomW + gutter, y: height * 0.53, w: bottomW, h: height * 0.2, rot: 0, framed: false },
    ],
    title: titleBand(width, height, 0.76),
    scrim: false,
  };
}

// The layout for a canvas of this size. An unknown id falls back to Nine Panel.
export function layoutPanels(id, width, height) {
  const gutter = panelGutter(width, height);
  switch (id) {
    case 'fullbleed':
      return fullBleedPanels(width, height);
    case 'four':
      return fourPanelPanels(width, height, gutter);
    case 'hero3':
      return heroThreePanels(width, height, gutter);
    case 'grid9':
      return ninePanelPanels(width, height, gutter);
    case 'mosaic':
      return mosaicNinePanels(width, height, gutter);
    case 'tilted':
      return tiltedSnapshotPanels(width, height);
    case 'story':
      return storyStackPanels(width, height, gutter);
    default:
      return ninePanelPanels(width, height, gutter);
  }
}
