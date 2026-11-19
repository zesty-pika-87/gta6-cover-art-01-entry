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
- **The art** — six layouts (Full Bleed, Four Panel, Hero + Three, Nine Panel
  with a halftone title band, Tilted Snapshots, Story Stack), five gradient-map
  grades (Vice Sunset, Neon Nights, Palm Dusk, Magenta Heat, Teal Noir),
  sunset-gradient Anton title lettering, a neon Pacifico subtitle, a ribbon
  badge and a five-star heat meter, plus grain and vignette.
- **Fast and easy** — a photo to an exported PNG in a few clicks, at
  1080 x 1080, 1080 x 1350, 1920 x 1080 and 1080 x 1920 (story), one at a time
  or all four at once. Undo and redo included.
- **Original** — no Rockstar logo, wordmark, artwork or font. The fonts are
  OFL files shipped under `app/fonts/` (Anton, Pacifico, Bebas Neue). The four
  sample photos in `app/samples/` are free to use.

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

## License

MIT — see [LICENSE](LICENSE).
