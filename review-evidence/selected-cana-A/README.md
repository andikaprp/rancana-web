# Selected A: Ranca and Cana

**User-selected design**, approved 2026-10-12 at 16:47 UTC. Source: `8890fa0336851bc4ce082a946cbcbf3f5b8ebdb5`, option A. This is the selected package, not another alternatives study.

## Start here

- `Ranca-Cana-selected-A.png`: clean full-pair preview at 1000px width.
- `Ranca-Cana-selected-A@2x.png`: 2000px preview.
- `Selected-A-overview.png` / `index.html`: selected default pair and the included expression set.
- `Selected-A-expression-set.png`: Cana's normal open, closed, and contextual half-lidded counterparts, with enlarged faces.

## Ready-to-use assets

Root `RancaCana.svg`, `Ranca.svg`, and `Cana.svg` are self-contained transparent SVGs for the normal-open default. Corresponding `*-transparent.png` files are ready-to-use raster assets. `editable-layers.json` references the included `assets/` body images.

`default-open/`, `closed/`, and `contextual-sassy/` each contain those three characters/arrangements plus a matching `face.svg`, PNG previews, transparent PNGs, standalone HTML previews and editable layer JSON. State JSON image paths resolve to `../assets/`. SVGs embed the images, so no asset-path repair is needed. Body images remain raster artwork, while eyes, lashes, mouths, arms and hands are editable vector marks. There is no animation in these files.

## Selected design

Cana has three short, soft, rounded white lashes per eye. Normal fully open white oval eyes are the default. Her closed counterpart is preserved. The half-lidded A artwork from `2f8ce89402d4b7a4d147813138faa16262b6066a` is included only as `contextual-sassy/`.

Cana is relaxed and friendly normally, with sass for fitting future situations. Ranca stays happy, kind and encouraging. Every character subtree exactly matches its selected source: bodies, texture, silhouette, colors, mouth, hands, scale and all Ranca artwork. Only presentation captions were removed for clean exports. The white eyes have no eyebrows or realistic eye details. Cana remains 90% of Ranca's visible body height.

Earlier A/B/C studies remain unchanged in the repository as history. Selecting A does not authorize publishing, deployment, production integration, animation rollout or MagicPath import. None was performed.

## Verification

From the repository, run `python3 review-evidence/selected-cana-A/build.py`, serve port 8140, then run `node check-selected-cana-A.mjs` with Playwright Chromium. Checks compare every character tree against the exact selected sources, verify three lashes per eye, root/default asset consistency, identical SVG/HTML pixels, and the static preview at 320/390px without overflow. `check.json` records results, including transparent PNG alpha verification. The final full-pair preview and matching full-character/face expression sheet were visually inspected. These are packaging checks, not production animation or live-site integration tests.
