# Rancana website

Read `MASCOT-REFERENCES.md` for mascot changes. The user selected Cana option A and now authorized implementation on the website. Keep this change in a draft PR; merging and deployment still require approval. Do not edit the Android app or another chat's PR24 branch.

Use `mascot-rig.js` / `mascot-data.js` for the shared selected identity. Ranca is always the navbar character. Preserve the original body WebP bytes and distinct silhouettes; do not add outlines, brows, realistic eyes or filters. Cana's three short soft white lashes and fully open normal eyes are default. Half-lidded eyes belong to contextual sass. Keep hands rooted inside the side silhouettes; rest arms downward, articulate active gestures.

Keep Pelajar/Mahasiswa canonical WebPs static and byte-identical. Keep the benefits sunglasses Cana static. Hero uses both hands, and footer hands stay active during hide-and-seek.

Retain semantic section motion, visibility interruption handling, reduced motion and footer occlusion by the real wordmark. Preserve main's mobile Flashcard markup, spacing, typography and unrelated copy. Prior design studies remain in their existing review branches/history.

After changes run the applicable package tests, `check-selected-website-mascots.mjs`, and mobile layout checks. Inspect deterministic real-page normal/mobile poses and loop transitions. Export fallback SVGs with `node scripts/export-mascot-assets.mjs` whenever rig artwork changes. `build-locales.py` regenerates localized pages after source HTML edits. Do not publish or deploy previews; the CI artifact contains an offline playable preview and recordings.
