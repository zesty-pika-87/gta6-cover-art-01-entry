# Cover Coast — GTA-style Cover Maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zesty-pika-87/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zesty-pika-87/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An entry for [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) on make.fun.

Cover Coast turns your own photos into a GTA-style poster cover: a multi-panel
poster with bold caption lettering and a Vice City sunset or neon colour grade,
exported as a PNG to share.

## What it does

- **Any photo** — add your own photos, fill several panels with one photo or
  several, and crop and position each panel by dragging it and scrolling to zoom.
  Shuffle deals a fresh spread of photos across the panels without putting the
  same photo twice next to itself.
- **The art** — seven layouts (Full Bleed, Four Panel, Hero + Three, Nine Panel
  with a halftone title band, Mosaic Nine with a tall hero and eight strips,
  Tilted Snapshots, Story Stack), six gradient-map grades (Vice Sunset, Neon
  Nights, Palm Dusk, Magenta Heat, Teal Noir, Golden Hour), sunset-gradient
  Anton title lettering that wraps to two lines instead of shrinking, a neon
  Pacifico subtitle, a ribbon badge and a five-star heat meter, plus
  deterministic grain, a sunburst behind the title band, and vignette.
- **Fast and easy** — a photo to an exported PNG in a few clicks, at
  1080 x 1080, 1080 x 1350, 1920 x 1080 and 1080 x 1920 (story), one at a time
  or all four at once (with progress). Exported files are named after the
  cover title, e.g. `cover-sunset-heist-1920x1080.png`. Undo and redo included.
- **Original** — no Rockstar logo, wordmark, artwork or font. The fonts are
  OFL files shipped under `app/fonts/` (Anton, Pacifico, Bebas Neue — see
  `app/fonts/OFL.txt` for attribution). The six sample photos in
  `app/samples/` are free to use: pier, boulevard, neon street, rooftop dusk,
  boardwalk day and rainy night. The nine-panel grids spread all six with no
  two neighbours alike, and repeated photos get different crops.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

`app/` is plain static files — no build step, no network request. `main.ts`
(Node 22, standard library only) copies `app/` and `screenshots/` to
`/output` and writes `/output/dossier.json`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshots are taken from fixed scenes in `shots.json` (`?shot=cover`,
`?shot=editor`, `?shot=cover-portrait`, `?shot=cover-square`); the first
screenshot is the 1920 x 1080 nine-panel cover, the shot the judge sees
largest.

## License

MIT — see [LICENSE](LICENSE).
