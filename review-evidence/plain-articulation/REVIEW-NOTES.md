# Early plain-body, two-arm test

This is the small review test requested after rejection of the costumed pose sheet. It is isolated from main acfd672 and from the previous rejected review branch. No backpack, cap, sunglasses or held object appears in the new test. The original plain references sit above three checkpoints per character.

Available artwork: single-view transparent rasters only. The test reuses the existing `assets/mascots/poses/ranca-body.webp` (741×532) and `cana-body.webp` (745×528), byte-identical copies. Their existing cleanup provenance is in `assets/mascots/poses/art-provenance.json`. No original 3D model or alternate views were found.

The body surface is an explicitly inferred depth reconstruction from the original silhouette. The original texture is projected onto that surface. Out-of-plane yaw/pitch, forward lean, volume-compensated compression and recovery change the projected body/face positions. This is not a claim to recover the original unseen geometry. Side/back texture, actual lighting and source sculpt depth are unavailable; the result is a limited-angle review approximation with baked source lighting.

Both arms have separate torso-attached shoulder anchors, two fixed-length segments, a solved bend point, a softly limited wrist target and hand orientation following the forearm. The small wrist greeting is additive at the final orientation step. White curves are a rounded rendering of those joint controls. Both wrist trajectories change: one leads, the other counterbalances. The body, face and limbs share a depth buffer, so the torso conceals shoulder sockets and far limbs without a draw-order pop. There is no leftover raster hand.

The original character shapes/colors and minimal face/hand vocabulary are the design references. No other brand's silhouette, oversized hand design or props are adopted. Motion references: https://archive.animade.tv/work/its-nice-that-extra-nice and https://archive.animade.tv/work/gizmo-ai-learning-tool . Control reference: https://battleaxe.co/rubberhose/docs/controls . No paid animation software is required.

First review deliverable: three-frame contact strip (lower anticipation, turn/forward lean, open reach) plus a four-second interactive prototype. Open the standalone HTML directly; WebGL is required. The source folder can alternatively be served with a local HTTP server. No MP4 or additional pose variants are included at this early approval stage.

Validation: fixed upper/forearm lengths, independent visible travel by both wrists, changing yaw/compression, far-arm depth changes and no page errors over 41 sampled frames. This is a structural/visual checkpoint, not approval of the proposed depth reconstruction or production motion.
