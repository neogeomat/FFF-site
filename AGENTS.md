# AGENTS.md

Static multi-page site (plain HTML/CSS/JS, no build step, GitHub Pages). `Webmap/` is a git submodule (separate repo).

## Run

```bash
python3 -m http.server 8123          # from website/
# → http://127.0.0.1:8123/index.html
```

- HTTP is required; `file://` breaks the `fetch` calls for CSV data.
- Use `127.0.0.1`, not `localhost` — Python's server binds IPv4 only.

## Tests

Manual Playwright scripts in `tests/`. `npm test` is a stub that errors; there is no lint/typecheck.

```bash
node tests/our_change_check.cjs      # server on :8123 required for every test
```

- `investment_map_check.cjs` also needs the submodule served separately: `python3 -m http.server 6115 --directory Webmap`; its last Webmap-nav checks fail without it.
- Tests assert exact copy and structure (e.g. h3 order on `our-change.html`, kicker numbers 1–5 on `sustainable-management.html`, dairy/fish geometry in catalog). When changing page copy, update the matching test in the same change.
- `package.json` and `pnpm-lock.yaml` are gitignored. Playwright comes from the local `node_modules`; do not add dependencies or build tooling.
- Origins are env-overridable: `BASE` for most checks, `SITE_ORIGIN`/`MAP_ORIGIN` for `investment_map_check.cjs`, `STORY_URL` for `storymaps_check.cjs`.

## Content data

- `js/catalog.js` and `js/sankey-page.js` fetch a published Google Sheet CSV at runtime; fallback is `Webmap/data/Grantees.combined.csv`.
- `data/site.json` and `data/orgs.json` are not loaded by any page — editing them has no effect. `index.html` hardcodes stats and the carousel (`window.__CAROUSEL__`, read by `js/main.js`).
- `data/stories.csv` drives `storymaps.html`.

## Conventions

- `README.md` is stale: it lists pages that do not exist (`territories.html`, `progress.html`, `challenges.html`) and a port-8000 command. Trust this file and the HTML files.
- Nav is duplicated in every page and in `Webmap/index.html`; keep labels identical ("Change Led by FFFPO Action", "FFFPO" spelling).
- High-level elements carry ids: `site-header`, page-specific section ids, `site-footer`.
- Catalog scenes: markup built in `js/catalog.js`, styling in `css/scene-catalog.css`. Per-chain photos live in maps: `CROP_IMG`, `FISH_IMG`, `CRAFT_IMG` (forest trees are CSS + emoji glyphs, no photo map).
- `value-chains.html` is only a redirect stub to `catalog.html`; chain browsing lives in the catalog.
- Images: catalog photos in `assets/img/catalog/*.webp`; homepage carousel photos in `assets/img/KLL Photo/`; deck extracts in `assets/img/deck/`. `2026-11-19/` holds only the source deck and its todo `.md`.

## Webmap submodule

- Separate git repo — edits appear as a dirty submodule; commit there on its own branch.
- It references site CSS/assets via `../`, so those 404 when served from the submodule root (expected, tests tolerate it).
- `Webmap/index.html?embed=1` hides its inner header for the homepage iframe.
