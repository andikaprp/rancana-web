# Ranca and Cana: current design instructions

The latest user corrections are from 12 October 2026, 11:26 UTC: correct ONLY Cana’s eye/lash orientation from 12db327 as a paired face. Each eye and its lashes must sweep toward its own outer corner, rather than both eye lines leaning the same way. Keep slight asymmetry for sass, two curved tapered lashes per eye, and no eyebrows. These override earlier preview interpretations.

GREEN RANCA represents the BOY: masculine, fun, happy and playful. His eyes are simple expressive curved WHITE LINES, now 25% wider than a4bde1c, with NO EYEBROWS and NO LASHES. Do not use open oval eye shapes, pupils or realistic eye details. Keep his cheerful mouth and selected open active hand posture.

PINK CANA represents the GIRL: clearly feminine in eye styling and attitude while remaining sassy/confident. Her eyes also use simple WHITE LINES, with elegant winged lines and two separated sweeping lashes per upper lid, with a fine variable-width contour that narrows smoothly to a tip and an asymmetric expression, with NO SEPARATE EYEBROWS. Keep the restrained smirk. Preserve the distinct asymmetric pink body; do not replace it with a recolored Ranca silhouette.

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

The current comparison shows exact `12db327` as the previous preview. Cana’s left eye/lash group is reoriented to mirror the right eye’s outward direction, using its existing shorter width (19 versus 23 local units) and gentler depth/tilt. The left group remains at (72,167) and rotates +8 degrees; the right remains at (117,166), -12 degrees. The rendered lid slopes are approximately 17 and 22 degrees. Both outer corners rise away from the center; both pairs of tapered lashes sweep toward their respective outer sides. The right eye/lash group is unchanged. All artwork outside Cana’s eye groups is unchanged, including Ranca, hands/arms, bodies, mouths, face placement and Cana’s 90% height. Neither character has eyebrows.

The normal-size pair and Cana close-up were visually inspected for paired direction, readable tapered lashes and asymmetric sassy expression. Geometry checks additionally verify outward corner directions, outward lash tips, retained eye origins/widths and unchanged non-eye artwork.

The approved curvature/spacing direction came from the supplied Fleischer Studios reference: https://images.squarespace-cdn.com/content/v1/69836b50ccc47d6e999702a9/7e3bf6fe-23fd-4135-8d86-d2c4f89cbda4/BB%2B4%2BJeni.jpg?format=1000w . The executor’s direct image download returned HTTP 403, so this revision follows the approved descriptive direction. Preserve Cana’s own identity and minimal artwork.

The editable handoff is in `review-evidence/no-brow-editable-bundle/`: named SVG face/hand paths, unchanged body WebPs, React source, self-contained HTML, clean PNG and labeled close-ups. Body textures remain raster images. MagicPath quota denial remains a parent-reported blocker; do not attempt another import. Updating these files does not complete that import.

No animation, website rollout, merge, production deployment or publishing is authorized by this preview request. Navbar identity remains green Ranca.
