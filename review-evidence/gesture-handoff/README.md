# Isolated gesture revision, 12 October 2026

Base: current main `acfd672dbe56f2dc51f4aecd3867ac732ed7719a`.
Reference: PR24 `326aaff2de233cfdee6640ded3bc1983993f7906`, separately checked out and rendered in Chromium before editing. The supplied Library references and hosted preview could not be transferred/opened in this executor. The exact commit's actual hero, footer search/count and sunglasses artwork were inspected locally. No write to PR24 or PR22/23 metadata.

## Proposed behavior

- Hero: Ranca opens a presenting palm; Cana makes a smaller, sassy lean with her other hand relaxed on her hip. Both settle into relaxed hands, with gaze, a brief blink, and changing white-line smiles.
- Footer: a shading/search hand, curled peeking grip, broad covering palms, and a short discovery point/open response. Shared wrist coordinates and matched cubic finger landmarks keep the contours connected through interpolation.
- Sunglasses Cana: separate ten-second relaxed lean, glasses adjustment, raised-glasses glance/wink, and return. It uses the exact wide original Cana raster body. Only the green glasses from PR24's reference composite are clipped/rendered over it; a green-channel alpha filter excludes baked white/pink fragments. No graduate body, hands, or silhouette are reused. The original reference bytes are retained unchanged as `assets/mascots/poses/cana-sunglasses-source.webp`.
- Navbar: current main's six-lobed green Ranca and its contextual expressions/motion remain unchanged. PR24's backpack/graduate flip is not adopted; the navbar never becomes Cana. Existing backpack and mahasiswa audience assets stay byte-identical.

## Integration limits

This is a review branch, not a merge of PR24. No favicon, copy, feature wrapper, spacing, or page-layout changes were adopted. PR25's direct-child mobile Flashcard selectors and composition remain intact. Sunglasses Cana is intentionally in `review-sunglasses-cana.html`, not yet inserted into the benefits section. `review-mascot-gestures.html` embeds the actual local ID/EN pages at desktop/390/320 widths with scene/pose playback controls. Both review pages and generated evidence are excluded from deployment.

Hero/footer and standalone accessory changes are in `companion-art.js` and `companion-motion.js`. Original cloud images, repaired body rasters, navbar renderer, and audience costumes are unchanged. Main's reduced-motion hero/footer originals remain the fallback contract; the sunglasses preview holds its relaxed articulated pose with glasses, with no running animations.

## Verification and review delivery

`check-gesture-review.mjs` checks ID/EN 320/390/1440, the identical Ranca navbar image through repeated section entries, exactly one mobile Flashcard composition, stable reduced motion, and separate sunglasses poses. Sunglasses paths are sampled every 100ms across its full loop for clipping, and pagehide/visibility interruptions repeat three times. It records desktop/mobile natural-speed sunglasses videos.

The existing companion suite now additionally covers 390px: 28 responsive scenes at 320/390/393/768/900/1440/1920, original hashes, body/feature counts, smooth independent changes, real stroke/UI clearance, glyph occlusion and transparent gaps, repeated visibility/resize lifecycle, reduced motion, and asset failures; four natural-speed hero/footer recordings. Existing website and mobile-layout checks run separately.

`.github/workflows/gesture-review.yml` runs only on this isolated branch or explicit dispatch; it has no deployment steps. Artifacts have `index.html` playable galleries alongside videos/stills/reports. Open `index.html` after extracting an artifact. For interactive source previews, serve the repository root (`python3 -m http.server 8000`) and open `/review-mascot-gestures.html` or `/review-sunglasses-cana.html`.

Local browser: system Chromium 151 and installed FFmpeg, because Playwright's download hosts were blocked. CI uses the repository's pinned Playwright browser. Visual review remains required; tests do not constitute user approval or permission to publish.
