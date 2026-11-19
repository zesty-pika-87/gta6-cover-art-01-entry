// Layouts for the cover: panel rects in pixels plus the title block, all derived
// from the canvas size so one layout serves every export size (square, portrait,
// landscape, story). Gutters are thin dark bands; the title block either floats
// over a scrim at the foot or sits in its own halftone band.

export const LAYOUTS = [
  { id: 'fullbleed', name: 'Full Bleed', slots: 1, blurb: 'One photo, edge to edge' },
  { id: 'grid4', name: 'Four Panel', slots: 4, blurb: 'Classic 2 x 2 poster grid' },
  { id: 'hero3', name: 'Hero + Three', slots: 4, blurb: 'Big hero left, three stacked right' },
  { id: 'grid9', name: 'Nine Panel', slots: 9, blurb: 'Cover grid with a title band' },
  { id: 'tilted', name: 'Tilted Snapshots', slots: 3, blurb: 'Polaroid snaps, askew' },
  { id: 'story', name: 'Story Stack', slots: 3, blurb: 'Tall stack for 9:16 stories' },
];

/**
 * Panel and title geometry for a layout at W x H.
 * Returns { panels: [{x,y,w,h,rot,frame}], title: {x,y,w,h,align,band}, scrim: bool }.
 * `panels` are drawn in order; `rot` is radians about the panel centre.
 */
export function layoutPanels(id, W, H) {
  const g = Math.max(2, Math.round(Math.min(W, H) * 0.012));
  const band = (y, h) => ({ x: 0, y, w: W, h, align: 'center', band: true });
  const foot = (y, h, align = 'center') => ({ x: W * 0.05, y, w: W * 0.9, h, align, band: false });

  switch (id) {
    case 'fullbleed':
      return {
        panels: [{ x: 0, y: 0, w: W, h: H, rot: 0, frame: false }],
        title: foot(H * 0.66, H * 0.28, 'left'),
        scrim: true,
      };
    case 'grid4': {
      const cw = (W - g) / 2;
      const ch = (H - g) / 2;
      return {
        panels: [
          { x: 0, y: 0, w: cw, h: ch, rot: 0, frame: false },
          { x: cw + g, y: 0, w: cw, h: ch, rot: 0, frame: false },
          { x: 0, y: ch + g, w: cw, h: ch, rot: 0, frame: false },
          { x: cw + g, y: ch + g, w: cw, h: ch, rot: 0, frame: false },
        ],
        title: foot(H * 0.70, H * 0.24),
        scrim: true,
      };
    }
    case 'hero3': {
      const hw = Math.round(W * 0.64);
      const rw = W - hw - g;
      const rh = (H - 2 * g) / 3;
      return {
        panels: [
          { x: 0, y: 0, w: hw, h: H, rot: 0, frame: false },
          { x: hw + g, y: 0, w: rw, h: rh, rot: 0, frame: false },
          { x: hw + g, y: rh + g, w: rw, h: rh, rot: 0, frame: false },
          { x: hw + g, y: 2 * (rh + g), w: rw, h: rh, rot: 0, frame: false },
        ],
        title: foot(H * 0.70, H * 0.24, 'left'),
        scrim: true,
      };
    }
    case 'grid9': {
      // The nine panels fill the top 76%; the title band owns the foot, so no
      // panel is hidden behind the lettering.
      const cw = (W - 2 * g) / 3;
      const ch = (H * 0.76 - 2 * g) / 3;
      const panels = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          panels.push({ x: c * (cw + g), y: r * (ch + g), w: cw, h: ch, rot: 0, frame: false });
        }
      }
      return { panels, title: band(H * 0.76, H * 0.24), scrim: false };
    }
    case 'tilted':
      return {
        panels: [
          { x: 0, y: 0, w: W, h: H, rot: 0, frame: false },
          { x: W * 0.05, y: H * 0.05, w: W * 0.30, h: H * 0.30, rot: 0.10, frame: true },
          { x: W * 0.20, y: H * 0.16, w: W * 0.60, h: H * 0.58, rot: -0.06, frame: true },
          { x: W * 0.65, y: H * 0.62, w: W * 0.30, h: H * 0.30, rot: 0.09, frame: true },
        ],
        title: foot(H * 0.76, H * 0.20, 'left'),
        scrim: true,
      };
    case 'story': {
      const tw = (W - g) / 2;
      const th = H * 0.20;
      return {
        panels: [
          { x: 0, y: 0, w: W, h: H * 0.52, rot: 0, frame: false },
          { x: 0, y: H * 0.53, w: tw, h: th, rot: 0, frame: false },
          { x: tw + g, y: H * 0.53, w: tw, h: th, rot: 0, frame: false },
          { x: 0, y: H * 0.53, w: 0, h: 0, rot: 0, frame: false },
        ].filter((p) => p.w > 0),
        title: band(H * 0.76, H * 0.24),
        scrim: false,
      };
    }
    default:
      return layoutPanels('grid9', W, H);
  }
}
