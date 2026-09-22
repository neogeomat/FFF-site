# Forest Farm Facility — Static Site (Plain HTML/CSS/JS)

Replicates https://upon-orchid-35798834.figma.site/ — 8 pages, English, no build step, GitHub Pages ready.

## Pages (English slugs)
- `index.html` Home
- `our-change.html` Our Change (/cambio)
- `sustainable-management.html` Sustainable Management (/gestion)
- `territories.html` Territories (/territorios) — placeholder for Webmap embed
- `value-chains.html` Value Chains (/cadenas)
- `catalog.html` Catalog (/catalogo)
- `progress.html` Progress (/avances)
- `challenges.html` Challenges (/retos)

## Run locally (HTTP required)
```bash
python3 -m http.server 8000 --directory website
# → http://localhost:8000
```
Do not open via `file://` — images load but JS `fetch` for data would fail.

## Structure
```
website/
  index.html, our-change.html, ... (8 pages)
  css/tokens.css, css/style.css
  js/main.js
  data/site.json, orgs.json, products.json
  assets/img/  (wire real .webp from /_components/v2/cb8c… when downloaded)
  assets/docs/CatalogoFFFBo.pdf (placeholder)
```

- Edit content in `data/*.json` and HTML `card` blocks — no React needed.
- All 61 product images from Figma are `.webp` under `/_components/v2/cb8c…/`; download with `wget --mirror` and drop into `assets/img/product-*.webp`, then add `<div class="card-media"><img…></div>` per card.
- Fonts: Fraunces / DM Sans / DM Mono via Google Fonts.
- Palette: --forest #1B2D1B, --gold #C4A44A, etc in `css/tokens.css`.

## Later: embed Webmap
In `territories.html` replace the `.map-frame` placeholder with:
```html
<iframe src="../Webmap/index.html" style="width:100%;height:620px;border:0;border-radius:16px"></iframe>
```
Webmap stays at `../Webmap` (separate git root `neogeomat/FFF-webmap`). No merging needed.

## Deploy to GitHub Pages
- New repo (e.g. `neogeomat/FFF-site`) → push `website/` contents to `main` root → Settings → Pages → Deploy from branch `main / (root)`.
- Or use `actions/deploy-pages@v4` workflow.
- `*.md`/`*.csv` are ignored in that Webmap `.gitignore` pattern — use `git add -f README.md` if sharing same repo history (prefer separate repo).

## Attribution
Original design via Figma Make. Images from Unsplash placeholders until real FFF assets copied. FAO Open Knowledge report: https://openknowledge.fao.org/handle/20.500.14283/cd8732es
