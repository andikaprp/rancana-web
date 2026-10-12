# Selected mascot identity on the website

`REVIEW-CHECKLIST.md` is the authoritative latest specification and overrides earlier interpretation.

The selected source is [8336f999](https://github.com/andikaprp/rancana-web/commit/8336f9994ecdce986ab8603b5507d909700c5aa6). Cana option A has three short white lashes per eye, normal fully open white ovals, and contextual closed/half-lidded states. No eyebrows or realistic details. The original body WebPs remain byte-identical to main.

Ranca is the original happy green six-lobed character; Cana is the smaller, wider asymmetric pink character. Preserve their colors, texture and silhouettes without outlines or filters. Navbar is always Ranca.

## Instance audit and user revision

- Navbar: shared selected Ranca rig; retain section-specific context and pause/resume behavior.
- Hero: both hands of each character present toward the phone. A small anticipation precedes elbow-led lifting, a clear two-handed hold, a secondary palm adjustment and a staggered settle. Interior shoulder roots remain fixed. Two smooth arm segments articulate elbows and wrists; wrists rotate by the shortest path.
- Pelajar and Mahasiswa: **original canonical static composition, face-only update** (`ranca-backpack-option-3.webp` and `cana-academic-cap-option-3.webp`). Never mount a rig, animate, isolate costume pixels or regenerate their bodies/hands. `scripts/static-mascot-art.js` replaces only the old facial ink with selected A facial marks. Pixel tests prove every pixel outside the bounded face region remains identical.
- Benefits: the glasses-wearing Cana was located in PR24's `.benefit-intro > .benefit-mascot`, using `cana-sunglasses-reference.webp`. This instance was absent from main/initial PR26. Only its static placement and original sunglasses pixels are carried into this revision. The approved prop-free Cana texture/face/arms sit underneath those sunglasses in one exported SVG. It has no clock. Its face is aligned to the existing glasses, with three lashes per eye and a glasses-adjusting static hand pose. No other PR24 layout/copy/Flashcard/favicon change is adopted, and PR24 itself remains untouched.
- Footer: real wordmark glyphs remain the foreground occluder. Both hands participate in reaching, shielding, scanning, peeking, hiding, counting and discovery. Ranca eagerly reaches/searches and celebrates; Cana playfully peeks, covers/counts and takes the searcher role. Downward rest is reserved for the loop's brief idle bookends.

## Rendering and validation

`mascot-data.js` contains the approved editable face sources; `mascot-rig.js` renders the original bodies and interpolates eyes/lashes, elbows, palms and wrists. Export fallback SVGs with `node scripts/export-mascot-assets.mjs`. No-JS fallback and reduced motion are static. Original audience WebPs are preserved in the static SVGs and bypass the runtime rig entirely.

`check-selected-website-mascots.mjs` covers original body/audience hashes, static audience and sunglasses, two-handed hero reach, all gesture bounds sampled every 125ms, fixed shoulder roots, loop equality, interrupted/repeated visibility, reduced motion, ID/EN at 320/390/1440 and supporting pages. Review videos include one full hero loop and two full footer loops on desktop/mobile. Deterministic screenshots cover anticipation/lift, hold, settling, search, count and discovery.

The new comparison gallery uses approved motion head `9692a9a` as its before state. Separate mobile CI continues to test the published mobile spacing/copy fixes against its original baseline. All page copy, main Flashcard markup and canonical texture bytes stay unchanged.

This is draft PR26 review work only. No merge, production deployment, Android changes or PR24 branch edits.
