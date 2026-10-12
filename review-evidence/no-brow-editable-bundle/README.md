# Ranca and Cana: editable no-brow handoff

This revises `a4bde1cb7d2f7e3f9abffea6a1241fda7ee15939`: Ranca’s eye lines are 25% wider, both waving palms are mirrored and their arms reconnected on the outside, and Cana’s lashes are half the previous size and stroke width. Bodies, resting limbs, mouths, face placement, Cana’s main eye contours and 90% visible body-height ratio are preserved. No eyebrows; new artwork is prop-free.

Both waving hands sit to the viewer’s left of their own body. OUTSIDE is screen-left, away from that body’s center: this is the connected arm/palm edge. INSIDE is screen-right, toward that body’s center: this is the disconnected/open wrist edge. Palm positions and angles are unchanged; contour orientation and the matching arm endpoint are corrected. `eye-hand-closeups.png` / `.html` show readable labels.

Open `preview.html` for the self-contained still preview or `Ranca-Cana-no-brows.png` for the clean image. The HTML contains all image bytes and has no network dependency. `RancaCana.svg`, `Ranca.svg` and `Cana.svg` contain individual named vector paths and embedded body textures. Individual character SVGs use their native artwork frames; the pair applies Cana's relative scale.

For editable MagicPath component work, use `RancaCana.jsx` and provide uploaded asset URLs through `rancaBodySrc` and `canaBodySrc`. The default URLs expect the supplied `assets/` folder. `RancaCana.embedded.jsx` embeds both bodies directly if data URI assets are accepted. Both export `RancaArtwork`, `CanaArtwork` and the default pair component. The named face and hand paths are literal SVG elements, with no whole-character flattening. `editable-layers.json` provides the same named layer tree.

The bodies are the existing raster WebPs from main, copied without alteration. Faces and hands are editable vectors (7 Ranca paths, 9 Cana paths). Do not describe the bodies as editable vectors. `manifest.json` lists path names, asset dimensions and SHA-256 hashes.

Local checks compare the previous panel with the exact a4bde1c named layer tree and verify no eyebrows; unchanged body bytes, resting limbs, mouths and Cana eye contours; the 90% body-height ratio; 25% wider Ranca eyes; half-size/half-weight Cana lashes; mirrored active palms with continuous outside arm joins and inside open gaps; pixel-identical standalone export; no page errors. See `no-brow-check.json` and `export-check.json`. JSX source is generated but has not been locally compiled: the MagicPath worker must validate the imported React component. An SVG imported as an image may not expose editable paths, so use the component/code workflow for actual path editing.

This executor prepared the source bundle only. MagicPath quota denial remains blocked at the parent worker; no import was attempted for this revision. No animation, website rollout, PR24 edit, merge or production deployment was performed.
