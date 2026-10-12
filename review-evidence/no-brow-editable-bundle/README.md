# Ranca and Cana: editable no-brow handoff

This is `77bafae3bacfedad31616360d5125f5af67e01e5` with only the three separate eyebrow paths removed. Line eyes, Cana's wings/lashes, mouths, hands, body rendering and the 90% Cana-to-Ranca visible body-height ratio are preserved. New artwork is prop-free.

Open `preview.html` for the self-contained still preview or `Ranca-Cana-no-brows.png` for the clean image. The HTML contains all image bytes and has no network dependency. `RancaCana.svg`, `Ranca.svg` and `Cana.svg` contain individual named vector paths and embedded body textures. Individual character SVGs use their native artwork frames; the pair applies Cana's relative scale.

For editable MagicPath component work, use `RancaCana.jsx` and provide uploaded asset URLs through `rancaBodySrc` and `canaBodySrc`. The default URLs expect the supplied `assets/` folder. `RancaCana.embedded.jsx` embeds both bodies directly if data URI assets are accepted. Both export `RancaArtwork`, `CanaArtwork` and the default pair component. The named face and hand paths are literal SVG elements, with no whole-character flattening. `editable-layers.json` provides the same named layer tree.

The bodies are the existing raster WebPs from main, copied without alteration. Faces and hands are editable vectors (7 Ranca paths, 9 Cana paths). Do not describe the bodies as editable vectors. `manifest.json` lists path names, asset dimensions and SHA-256 hashes.

Local checks passed: no separate eyebrows; unchanged eyes, mouths, hands and body bytes; 90% body-height ratio; straight downward Ranca resting arm; standalone HTML renders pixel-identically to the no-brow source scene; no page errors. See `no-brow-check.json` and `export-check.json`. JSX source is generated but has not been locally compiled: the MagicPath worker must validate the imported React component. An SVG imported as an image may not expose editable paths, so use the component/code workflow for actual path editing.

This executor prepared the source bundle only. The authorized MagicPath production import belongs to the parent worker and is not yet claimed complete. No animation, website rollout, PR24 edit, merge or production deployment was performed.
