# Review-only articulated Ranca prototype

This isolated page preserves the prototype reviewed and approved by the owner. Its artwork and six articulated gestures are now integrated into the shared website header on the draft branch. This page itself is not deployed.

It reuses the previously reconstructed sharp SVG's native cloud, jade gradient, rim lighting, eye arcs, smile and hand paths, split into transform groups. Favicon cropping and its white square are removed. No bitmap features are covered or duplicated, no new pupils or side icons are added, and original path geometry stays unchanged during motion.

The vector is an approximation of the approved full raster, particularly its lighting and silhouette. The owner approved this disclosed difference after reviewing the prototype. Left is the approved raster; right is the rig.

The gesture order is greeting, attentive reading, organizing hands, relaxed eyes, downward guiding hand, and curious eye asymmetry. The hands retain their original open/curled outlines; the download gesture is a downward hand cue, not a newly drawn pointing finger. Arc-eye compression suggests a squint rather than a literal blink of an open eye.

The historical prototype page displays the rig at the previous desktop header dimensions (34 × 26 CSS pixels) and an enlarged inspection size. Hand strokes are roughly half a CSS pixel in the header and white hands can disappear outside the green silhouette on white. Distinct articulation may only be clearly readable in the close-up. No outlines or colors were changed to conceal that limitation.

`check-ranca-rig.mjs` captures actual browser output and verifies independent part motion, unchanged vector paths, fixed wordmark, reduced motion and hidden-document cancellation. These files and outputs are excluded from deployment by `.assetsignore`.

## Integrated header

The production header uses the same approved path geometry at 48 × 35 CSS pixels on desktop and 44 × 32 on mobile. The pill remains 48 pixels tall and the wordmark stays stationary. A bundled static SVG supplies the no-JavaScript fallback; the shared script inserts the same trusted vector for independent hand, eye and smile animation. The six entry gestures last 1.9 seconds; idles last 1.4 seconds after five quiet seconds. Reduced motion, hidden/offscreen pauses, scroll debounce and coalesced section changes retain the shared controller. Policy pages keep quarter-amplitude whole-vector motion with longer pauses. Integration does not change the hero/footer artwork, favicons, translations or links.
