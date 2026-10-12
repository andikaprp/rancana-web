# Ranca and Cana: editable no-brow handoff

This revises only Cana’s lashes from `e488ad405c1d072e91e75ffb4466713de9ba097f`. Each eye now has two separated light sweeping curves, with smooth tapered tips. Main eyelid lines are unchanged. All other artwork is preserved exactly, including Ranca, all hands/arms, mouths, body rendering and Cana’s 90% height. No eyebrows; new artwork is prop-free.

The lashes remain editable white vectors. Each is a curved closed contour whose width decreases from approximately 1.7 local units at its lid-attached base to about 1.04 in the middle, then to zero at the tip. The two lash path elements contain two contours each; the bundle still has 7 Ranca paths and 9 Cana paths.

For normal display, use `Ranca-Cana-normal-size.png` (1000×447). The full-resolution pair is `Ranca-Cana-no-brows.png` (1600×715). `Cana-lashes-closeup.png` and `.html` show the lash spacing. Every SVG, React component and preview in this bundle contains the same revised geometry.

Both waving hands sit to the viewer’s left of their own body. OUTSIDE is screen-left, away from that body’s center: this is the connected arm/palm edge. INSIDE is screen-right, toward that body’s center: this is the disconnected/open wrist edge. Palm positions and angles are unchanged; contour orientation and the matching arm endpoint are corrected. `eye-hand-closeups.png` / `.html` show readable labels.

Open `preview.html` for the self-contained still preview or `Ranca-Cana-no-brows.png` for the clean image. The HTML contains all image bytes and has no network dependency. `RancaCana.svg`, `Ranca.svg` and `Cana.svg` contain individual named vector paths and embedded body textures. Individual character SVGs use their native artwork frames; the pair applies Cana's relative scale.

For editable MagicPath component work, use `RancaCana.jsx` and provide uploaded asset URLs through `rancaBodySrc` and `canaBodySrc`. The default URLs expect the supplied `assets/` folder. `RancaCana.embedded.jsx` embeds both bodies directly if data URI assets are accepted. Both export `RancaArtwork`, `CanaArtwork` and the default pair component. The named face and hand paths are literal SVG elements, with no whole-character flattening. `editable-layers.json` provides the same named layer tree.

The bodies are the existing raster WebPs from main, copied without alteration. Faces and hands are editable vectors (7 Ranca paths, 9 Cana paths). Do not describe the bodies as editable vectors. `manifest.json` lists path names, asset dimensions and SHA-256 hashes.

Local checks compare the previous panel with the exact e488ad4 named layer tree, verify all artwork except Cana’s lash elements is unchanged, and check two curved contours per eye, lid attachment, spacing, continuous width taper, sideways sweep, no eyebrows and 90% body-height ratio. The standalone export renders pixel-identically to the source scene; body bytes are unchanged and no page errors occur. See `no-brow-check.json` and `export-check.json`. JSX source is generated but has not been locally compiled: the MagicPath worker must validate the imported React component. An SVG imported as an image may not expose editable paths, so use the component/code workflow for actual path editing.

This executor prepared the source bundle only. MagicPath quota denial remains blocked at the parent worker; no import was attempted for this revision. No animation, website rollout, PR24 edit, merge or production deployment was performed.
