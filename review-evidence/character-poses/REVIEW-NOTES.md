# Rancana full-character pose review

Two original reference characters plus five coordinated poses each: wave/happy, present/curious, point/thinking, hold/playful and peek/surprised. Both hands now change with context. Ranca keeps the backpack and cheerful bean-eye vocabulary; Cana retains her separate asymmetric pink body, graduation cap, slanted lids and cheekier expression. Expressions blink and change with the gestures. Ranca uses two little waves, Cana one slower wave. Held poses include gentle leaning/tilting and small bounces. Cana holds a blank study card in the holding candidate; Ranca holds his backpack straps.

This expands the independently preserved greeting study at commit `2c46531`. The original canonical assets are byte-identical. Artwork starts with the same raster bodies, costumes and shading. The former white hand/face pixels are locally reconstructed, then minimal white vector marks are layered over them. No image-generated replacement body or realistic face details are introduced.

The cleaned pixels are estimates, not recoverable original artwork. Both body edges under the former outside arm strokes require a small interpolated alpha repair. Ranca's backpack strap beneath the original grips also needs local reconstruction. The page exposes clean plates and their masks. Pixel areas outside those masks retain the original source rendering; rigid body transforms move the complete character together.

These are 2D turns/tilts, leans and bounces, not new three-dimensional views. There is no source artwork for a true side/back turn. The sources are only 244×320 and 236×320; large exports upscale that existing detail. The proposed vector face marks are reconstructions in the original vocabulary and still need visual approval. The PNG is a review sheet, not evidence of approval.

Open the playable folder through a local HTTP server. `python3 -m http.server 8135` from the folder serves `http://localhost:8135/`. The slider inspects all 13 seconds. Normal animation pauses offscreen or while hidden; reduced motion shows a static pose and allows manual scrubbing. Standalone SVG pose exports embed their raster clean plate.

No website HTML/CSS/JavaScript, favicon, copy or original mascot assets were changed. PR24's branch, feature wrappers and other edits remain untouched. The branch inherits only the isolated audience-reference study/documentation from current-main-based review work. It must not be merged, deployed or applied to the social storyboard without further review.
