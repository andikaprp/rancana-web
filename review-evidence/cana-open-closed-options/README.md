# Cana: three lash options, closed and open

Static review study based on `ddb7c008bb81d5e3e4f44256cf63240c8802efb9`. No option is selected.

## Review files

- `Cana-ABC-open-closed.png`: complete A/B/C comparison.
- `A-open-closed-card.png`, `B-open-closed-card.png`, `C-open-closed-card.png`: each option's full Cana CLOSED/OPEN pair at the same normal display scale, then corresponding enlarged face crops.
- `Cana-face-state-contact-sheet.png`: all six matching face crops.
- `index.html`: self-contained static comparison; open locally in a browser.
- `face-contact-sheet.html`: self-contained face comparison.
- Each `{A,B,C}/{closed,open}/` folder includes full-pair and Cana PNGs, a face PNG, self-contained HTML previews, editable `Cana.svg` and `RancaCana.svg`, and `editable-layers.json`.

The SVG body images are embedded, while face/hand paths are editable vector layers. Layer JSON references the unchanged body WebPs included in `assets/`. The bodies are raster artwork, not newly vectorized shapes.

## State design and preservation

Actual canonical Pelajar and Mahasiswa WebPs were visually inspected: `assets/mascots/ranca-backpack-option-3.webp` and `assets/mascots/cana-academic-cap-option-3.webp` in the repository. The open-eye study draws on the Mahasiswa small filled white half-oval beneath a simple lid, without copying its eyebrows or adding realistic eye detail.

CLOSED states are exact copies of the current A/B/C baselines. OPEN states lift the existing left/right upper lids by 3.6/3.4 local units and add two simple white half-ovals. Each lash keeps its original path, thickness and spacing and is reflected upward about its root and translated with the raised lid. A retains three rounded strokes, B four graduated tapered curves, and C five fine tapered wisps. There are no eyebrows, pupils, iris details, V-eyes or same-direction diagonal sweeps.

All artwork outside Cana's eye groups is unchanged: body images, shape, texture, color, mouth, hands, scale and all Ranca artwork. Cana remains 90% of Ranca's body height. Normal display scale is 0.625, matching Cana in the 1000px-wide pair. Every face crop uses the same `1030 275 285 180` viewBox.

## Validation

Rebuild with `python3 review-evidence/cana-open-closed-options/build.py`. Serve the repository on port 8140, then run `node check-cana-open-closed-options.mjs` with Playwright Chromium installed. The build asserts exact closed baselines and unchanged non-eye artwork; browser checks verify all six states, fixed framing/scale, expected lash counts, root attachment to the lids, and matching SVG/HTML pixels. `check.json` contains the measured results. All three full-character comparison cards and the six-face contact sheet were visually inspected.

This is static state exploration only. No animation, website integration, permanent selection, MagicPath retry/import, merge or deployment was performed. Motion, responsive live-site integration and smooth transitions are outside this revision's scope.
