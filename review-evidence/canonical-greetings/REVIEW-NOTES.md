# Full-character canonical greeting candidates

These are two isolated six-second greeting tests. They are not website changes or a new shared mascot design. Both original audience references appear beside the candidates at native dimensions.

- Ranca keeps the original green Pelajar body, backpack, face, and right grip. The left palm is open, with three short rounded finger arcs, a rounded thumb, and no closed wrist seam. A small lift leads to two wrist waves and a return to the ready position.
- Cana keeps the original separate pink Mahasiswa body, cap, face, and right raised index. Her left palm uses a separately drawn, slightly shorter contour, a lower lift, one slower wave, and a longer hold. Her half-lidded expression remains the original artwork.
- Both retain 3.6/3.7 source-pixel white strokes with rounded caps and joins. The arm connects tangentially to the open wrist. There are no inner palm creases, realistic details, or new body outlines.

## Raster repair boundary

The old hands are baked into single-frame WebPs. The original files are not rewritten. The preview embeds their exact bytes, overlays a small clean plate on the moving hand/arm, and draws the new arm and palm separately. The other hand and original body silhouette, face and costume outside the cleanup mask stay unchanged.

Ranca needs a local reconstruction of the backpack strap behind the old filled palm, derived from the visible strap above and below the grip. The hidden pixels cannot be recovered exactly. A slight texture/edge transition can be visible in a large enlargement. This is a review clean plate, not approved replacement production artwork. Cana's smaller cleanup interpolates nearby pink pixels, preserving the smile. The page provides both the repaired bases and a mask toggle.

Source resolution remains 244×320 (Ranca) and 236×320 (Cana). Larger videos are upscaled previews, not newly generated high-resolution character art. No face or body was regenerated, recolored, reshaped, or given a rim.

## Files and playback

Run `python3 -m http.server 8135` in this folder and open `http://localhost:8135/` for the playable comparison. JavaScript reads the original files for its cleanup overlay, so use a local server rather than opening the HTML with a file URL. The artifact's `playable/` folder includes all four required HTML/JS/WebP files.

The output artifact also contains two 1080×1350 MP4 previews, native-size transparent full-character PNG frame sequences (180 frames each at 30 fps), five embedded-raster transparent SVG checkpoints per character, responsive comparisons, cleanup diagnostics and test results. SVG checkpoints are self-contained. Individual hand vectors alone are not finished mascot art.

The six-second loop begins/ends in an open-palm ready pose. It is specifically a greeting; it does not establish searching, discovering, presenting, resting, sunglasses, navbar, or footer gestures. Those contexts still need separate review using these canonical identities.

## Integration limits

The branch is based on the canonical audience study, itself based on main `acfd672dbe56f2dc51f4aecd3867ac732ed7719a`. It inherits reference documentation and the previous isolated study. PR24 and its branch are untouched; none of its feature wrappers, favicon or other layout changes are included. Site HTML, CSS, JavaScript and original assets remain byte-identical to that main revision. This preserves PR25 mobile flashcard visibility and spacing.

There is no approval to publish, merge, deploy, or apply this rig to website scenes or the social storyboard. The localized cleanup is an explicit review limitation. The browser checks establish rendering behavior and source preservation, not design approval.
