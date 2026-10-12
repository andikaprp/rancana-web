# Ranca and Cana: current design instructions

The latest user corrections are from 12 October 2026, 09:46 UTC: revise ONLY Cana’s lash distribution from d1d034f. Use three separated short curved lashes across each upper eye line, from inner/middle to outer, readable at normal display. Keep fine weight and avoid a dense comb, spikes or separate eyebrows. These override earlier preview interpretations.

GREEN RANCA represents the BOY: masculine, fun, happy and playful. His eyes are simple expressive curved WHITE LINES, now 25% wider than a4bde1c, with NO EYEBROWS and NO LASHES. Do not use open oval eye shapes, pupils or realistic eye details. Keep his cheerful mouth and selected open active hand posture.

PINK CANA represents the GIRL: clearly feminine in eye styling and attitude while remaining sassy/confident. Her eyes also use simple WHITE LINES, with elegant winged lines and three separated short curved lashes distributed across each upper lid (fine 1.4 stroke weight, unchanged from d1d034f) and an asymmetric expression, with NO SEPARATE EYEBROWS. Keep the restrained smirk. Preserve the distinct asymmetric pink body; do not replace it with a recolored Ranca silhouette.

Cana is only slightly smaller than Ranca. Use approximately 90% of Ranca's visible BODY HEIGHT through uniform scaling, preserving the original aspect ratio and naturally wider Cana shape. The 50% interpretation in 72c33b7 was rejected. The older 94% instruction is also superseded by the current approximately 90% comparison.

## Selected hand/style source

The user selected the first full-character sheet at commit `e8af2396b35c1ba6c5752a8a83cff2eaa3100725`, artifact `11726713733`, `first-review-sheet.png`, as the preferred active hand/eye-style reference. Preserve its good active hand gestures. Newer explicit LINE-ONLY eye instructions override its filled eye shapes. Do not substitute the rejected five-state or later rest-only face systems globally.

Mirror each waving palm contour horizontally around its existing wrist frame so the arm joins the OUTSIDE edge (away from that character’s body center), with the open/disconnected wrist on the INSIDE. Both current waving hands are on the viewer’s left of their respective bodies, so outside is screen-left and inside is screen-right. Recompute the joining arm curve to meet the mirrored contour; preserve its shoulder/elbow and hand position/angle. Keep the selected active hand and the long straight descending resting arm from `72c33b7`. Ranca's resting palm retains the selected contour at the end of that straight line. Do not reintroduce the awkward bent resting arm across his belly. Keep the smooth thin rounded white line style and open wrist connection. Hands and faces may change with intent in future authorized animation, but the current request is a still comparison only.

## Canonical artwork

Inspect the actual audience images for style/anatomy, not fixed pose copying:

- Pelajar Ranca: `assets/mascots/ranca-backpack-option-3.webp` (244×320).
- Mahasiswa Cana: `assets/mascots/cana-academic-cap-option-3.webp` (236×320).

The audience images show activity-specific poses: Ranca holds backpack straps, Cana teaches/gestures. They are not neutral idle references. The original files stay unchanged.

Prop-free previews use the existing `assets/mascots/poses/ranca-body.webp` and `cana-body.webp`. Their cleanup provenance is in `assets/mascots/poses/art-provenance.json`. Retain the smooth shading, original colors and distinct silhouettes, without a new rim or outline. The selected vector contours are registered to those existing plain bodies. This adaptation is not an exact costume removal from the original costumed raster. Small exact historical reference thumbnails may keep their original costumes; new examples are plain.

## Current review scope

The current comparison shows exact `d1d034f` as the previous preview. Only Cana’s two lash paths change: three separate curved strokes per eye attach to the upper lid and span roughly 73–74% of its width, instead of clustering at its outside edge. The fine 1.4 stroke weight is unchanged. All other rendered artwork is identical, including both main eye lines, both bodies, all arms/hands, mouths, face placement, Ranca’s longer eyes and Cana’s 90% body-height scale. Neither character has eyebrows.

The editable handoff is in `review-evidence/no-brow-editable-bundle/`: named SVG face/hand paths, unchanged body WebPs, React source, self-contained HTML, clean PNG and labeled close-ups. Body textures remain raster images. MagicPath quota denial remains a parent-reported blocker; do not attempt another import. Updating these files does not complete that import.

No animation, website rollout, merge, production deployment or publishing is authorized by this preview request. Navbar identity remains green Ranca.
