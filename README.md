# Cover Coast — GTA-style Cover Maker

[![make.fun bounty](https://img.shields.io/badge/make.fun-gta6--cover--art--01-ff2e88)](https://make.fun/c/gta6-cover-art-01)
[![owner](https://img.shields.io/badge/owner-zesty--pika--87-7a5cff)](https://github.com/zesty-pika-87/gta6-cover-art-01-entry)
[![reward](https://img.shields.io/badge/reward-%2450%20top%20prize-ffd23e)](https://make.fun/c/gta6-cover-art-01)

Turn your own photos into a GTA-style poster cover and export it as a PNG to share. Cover Coast fills a multi-panel poster from any photos, crops and positions each one, grades it in a Vice City sunset or neon palette, and letters your caption in bold poster type — all offline, in the browser, with your photos never leaving your machine.

## What it does

- **7 layouts** — Full Bleed, Four Panel, Hero + Three, Nine Panel, Mosaic Nine, Tilted Snapshots (framed polaroids over a dimmed backdrop), Story Stack.
- **6 colour grades** — Vice Sunset, Neon Nights, Palm Dusk, Magenta Heat, Teal Noir, Golden Hour. Each is a five-stop gradient map with smooth interpolation and a strength slider.
- **Any photo** — add your own images, click a photo then a panel to place it, drag a panel to pan, scroll to zoom, shuffle to re-deal the photos. Six free sample photos are bundled so it works out of the box.
- **Poster lettering** — Anton title with a gold-to-pink gradient (wraps to two balanced lines when needed), Pacifico neon subtitle, a tilted badge ribbon and a five-star heat meter.
- **Export PNG in 4 sizes** — Square 1080 × 1080, Portrait 1080 × 1350, Landscape 1920 × 1080, Story 1080 × 1920 — one at a time or all four at once. File names come from the title: `cover-sunset-heist-1080x1080.png`.
- **Undo / redo** — every edit is a snapshot, up to 60 steps back.
- **Deterministic effects** — seeded film grain, vignette, halftone dots and sunburst rays, identical in the preview and every export.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Hand the entry in (Node 22):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `app/` and `screenshots/` to the output directory, checks the screenshots against the scorer's caps (exactly 4, each at most 256 KiB, long side at most 1280 px, short side at least 480 px), and writes `dossier.json`.

## Screenshots

Four fixed scenes (`shots.json`): the first is the cover — a 1920 × 1080 Nine Panel cover, "Sunset Heist" in Vice Sunset — followed by the editor at work, a portrait cover ("Boulevard Queen", Golden Hour) and a square Mosaic Nine cover ("Neon Nights").

## Originality

No Rockstar Games logo, wordmark, artwork, character or font is used anywhere. The lettering fonts — Anton, Pacifico and Bebas Neue — are SIL Open Font License files under `app/fonts/` (see `app/fonts/OFL.txt`). The six sample photos are free to use. All art, code and design in this repository are original.

## License

MIT — see [LICENSE](LICENSE).
