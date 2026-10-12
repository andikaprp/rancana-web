# Selected mascot identity on the website

The selected source is [8336f999](https://github.com/andikaprp/rancana-web/commit/8336f9994ecdce986ab8603b5507d909700c5aa6). Option A has three short soft white lashes on each Cana eye. Normal fully open white oval eyes are default, with the selected closed and contextual half-lidded counterparts. No eyebrows or realistic facial details. The original body WebPs are byte-identical to main and the selected source.

Ranca is the green, masculine, cheerful/playful and encouraging companion. Cana is pink, feminine, normally friendly and relaxed; sass or cheekiness appears only where it fits. Cana remains slightly smaller, with the original wider asymmetric silhouette. Do not exchange their bodies or use a permanently sleepy Cana.

## Instance audit and implementation

- Navbar on all 22 localized pages and source pages: Ranca only, with welcome, study, feature, encouragement, download and question gestures plus restrained supporting-page contexts. Navigation/CTA logic is independent of the decorative renderer.
- Homepage hero: the pair presents the phone screen with inward-facing open palms, then settles to long downward rest arms.
- Audience cards: selected faces and hands, plus original canonical backpack/cap pixels isolated using SVG accessory clips. Original source WebPs are retained. The body silhouette comes from the selected character, not a redrawn generic cloud. The cards greet, read and blink.
- Footer on home and supporting pages: original hide-and-seek timing, real text foreground and transparent counters. Search, peek, discovery, cover/count and role swaps use articulated hands. Cana's half-lidded expression is contextual during the cheeky peek; her neutral state is fully open.

The canonical audience files were visually inspected. Accessory clip paths isolate the original costume pixels; no generative imagery or new costume design was introduced. The approved raster bodies are untouched. Existing PR24 and earlier alternative studies were not merged or modified.

## Rendering and validation

`mascot-data.js` contains the approved editable source trees. `mascot-rig.js` renders one body and one face, morphing eyes/lashes together and anchoring arms at fixed interior shoulders. It uses no body recoloring or outline. The selected neutral SVG fallbacks are exported from the same renderer for no-JS and failed-module use. Reduced motion shows the selected neutral rig without clocks.

`check-selected-website-mascots.mjs` replaces the old drawing-specific header/controller assertions for the earlier rig. Those older tests remain in history; they describe superseded exact path coordinates. Current coverage checks body hashes, the six companion instances plus navbar, each context, root positions, loop resets, paused/manual/repeated visibility, reduced motion, supporting pages, ID/EN, 320/390/1440px, and real rendered screenshots/videos. Existing navigation, copy, privacy/analytics, six-width mascot layout and mobile Flashcard checks remain active.

Review artifacts include deterministic before/after main versus selected-A screenshots, actual desktop/mobile WebM playback, and a portable website ZIP. Run its `preview-server.mjs` locally to inspect the full website. No merge or deployment is part of this implementation task.
