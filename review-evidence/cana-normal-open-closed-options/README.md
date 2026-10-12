# Cana: normal open versus closed eyes

Static review for all three unselected lash options. Closed-state source: `ddb7c008bb81d5e3e4f44256cf63240c8802efb9`. The previous half-lidded study is a separate contextual sassy expression at commit `2f8ce89402d4b7a4d147813138faa16262b6066a`, not the default open state.

## Review files

- `Cana-ABC-open-closed.png`: complete A/B/C comparison.
- `A-open-closed-card.png`, `B-open-closed-card.png`, `C-open-closed-card.png`: normal full-character CLOSED/OPEN pairs and matching enlarged face crops.
- `Cana-face-state-contact-sheet.png`: all six face crops.
- `index.html` and `face-contact-sheet.html`: self-contained static browser previews.
- Each `{A,B,C}/{closed,open}/` folder: full-pair, full-Cana and face PNGs; editable `Cana.svg`, `RancaCana.svg` and `editable-layers.json`; standalone HTML previews.

Body images are embedded in the SVG exports. Face and hand paths remain editable vectors. JSON image references resolve from this bundle's root `assets/` folder. Bodies remain the unchanged raster artwork.

## Expression and preservation

Cana is normally relaxed and friendly. Sass, judgment or cheekiness belongs to fitting future situations. Ranca remains consistently happy, kind and encouraging. This study adds no character behavior or further expressions.

Actual canonical Pelajar (`ranca-backpack-option-3.webp`) and Mahasiswa (`cana-academic-cap-option-3.webp`) images were visually inspected. The Pelajar fully open white graphic eyes guide the new normal-open shape: modest upright solid white ovals with smooth upper curves, rather than a flat lid crossing the eye. There are no eyebrows, realistic pupils, irises or highlights. The eyes are comfortably open rather than enlarged into a surprised expression.

A retains 3 short rounded lashes per eye, B 4 graduated tapered lashes, and C 5 fine tapered wisps. Each original lash path and weight is preserved. Attachment points follow the rounded upper edge with proportional spacing and restrained outward orientation. A non-rendered upper arc in the editable source documents those attachment points; the white oval itself supplies the continuous visible edge.

All closed-state JSON trees exactly match the baseline. All non-eye source artwork is unchanged: body, texture, silhouette, mouth, hands, scale, colors and Ranca. Displayed captions now say only `Cana`, removing the blanket `sassy` label; editable JSON retains the original baseline caption. Normal display scale remains 0.625, matching Cana in a 1000px-wide pair. All enlarged faces use the identical `1030 275 285 180` crop.

## Validation

From the repository, run `python3 review-evidence/cana-normal-open-closed-options/build.py`, serve the repository on port 8140, and run `node check-cana-normal-open-closed-options.mjs` with Playwright Chromium installed.

Build assertions verify exact closed baselines and unchanged non-eye artwork. Browser checks cover six states, fixed scale/crops, expected lash counts, lash roots attached to the curved upper edge, upright natural eye proportions, no eyebrows, no page errors, and pixel-identical SVG/HTML pair exports. Measured results are in `check.json`. All three final normal-size comparison cards and the six-face contact sheet were visually inspected.

Review only: no option selection, animation, MagicPath import, website integration, merge or deployment. This revision makes no live-site responsive or animation claims.
