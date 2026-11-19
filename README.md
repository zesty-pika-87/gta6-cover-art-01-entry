# Cover Coast — GTA-style Cover Maker

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/zesty-pika-87/gta6-cover-art-01-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/zesty-pika-87/gta6-cover-art-01-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Cover Coast turns your own photos into GTA-style cover art, in the browser, offline. Pick a layout, pick a colour grade, write the title, export the PNG and share it. Your photos never leave your machine.

- **7 layouts** — Full Bleed, Four Panel, Hero + Three, Nine Panel, Mosaic Nine, Tilted Snapshots, Story Stack.
- **6 colour grades** — Vice Sunset, Neon Nights, Palm Dusk, Magenta Heat, Teal Noir, Golden Hour. Each one is a smooth gradient map over the photos, with a strength slider.
- **Poster lettering** — a big Anton title in a sunset gradient with a dark outline, a Pacifico script subtitle in glowing cyan, a tilted badge ribbon and a five-star heat meter.
- **Photo handling** — load as many of your own photos as you like, click a photo then a panel to place it, drag a panel to move its photo, scroll to zoom it, shuffle the panels without ever putting the same photo twice side by side.
- **Export** — PNG in 4 sizes at once: Square 1080×1080, Portrait 1080×1350, Landscape 1920×1080, Story 1080×1920. File names carry the title, like `cover-sunset-heist-1080x1080.png`.
- **Undo / redo** — every change is a step you can walk back.
- **Effects** — deterministic film grain (identical in preview and every export), vignette, halftone dots and sunburst rays in the title band, a thin white poster frame.

## Originality

Everything here is original work. No Rockstar Games logo, wordmark, artwork, character or font is used anywhere. The three fonts — Anton, Pacifico and Bebas Neue — ship under the SIL Open Font License; see `app/fonts/OFL.txt`. The six sample photos are free to use.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Node 22, standard library only, no build step, no network requests: `app/` is plain static files.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` into the output directory, checks that there are exactly 4 screenshots of at most 256 KiB each, and writes `dossier.json` there with `buildDossier` from `vendor/makefun-app.ts`. Running it twice over the same inputs writes byte-identical output.

## Screenshots

Four fixed scenes, listed in `shots.json`, each rendered by the app itself through `?shot=`:

1. `1-cover.jpg` — the hero cover, 1920×1080: Nine Panel, Vice Sunset, "Sunset Heist".
2. `2-editor.jpg` — the editor with a photo loaded, 1280×720.
3. `3-cover.jpg` — a portrait cover, 864×1080: Nine Panel, Golden Hour, "Boulevard Queen".
4. `4-cover.jpg` — a square cover, 1080×1080: Mosaic Nine, Neon Nights, "Neon Nights".

The first screenshot by name is the cover — the one the judge sees largest.

## License

MIT. See `LICENSE`.
