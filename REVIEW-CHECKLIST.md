# PR26 authoritative mascot review checklist

This file supersedes earlier ambiguous instructions. Freeze all approved details outside the changes below. Baseline motion/layout: `9692a9a83f49cbf701f1651327d3ec862e220c7c`. Face source: selected A `8336f9994ecdce986ab8603b5507d909700c5aa6`.

| Requirement | Implementation and verification gate |
| --- | --- |
| Pelajar Ranca static, approved cheerful line eyes | Exported static SVG preserves the canonical backpack illustration. Replace only facial ink; compare all pixels outside the face region to the original. Original body, backpack, arms, hands, canvas and placement stay identical. |
| Mahasiswa Cana static, option A face | Same face-only pixel gate; fully open white ovals, three short lashes per eye, simple smile and no brows. Original cap/body/hands/pose stay identical. |
| Glasses Cana static, purposeful pose | Keep the exact approved body image, placement and sunglasses image/clip/transform. Face has option A eyes behind the opaque glasses, three short visible lashes along each rim and a friendly smile. One hand adjusts the glasses; the other rests comfortably near her waist. No animation or new prop. |
| Outer arm → thumb → three fingers → palm | Every editable arm meets the palm path's OUTER start at (-4,11). The only gap is at the INNER endpoint (+4,11). Verify open/rest/reach/cover/discovery closeups and joins throughout transitions. Canonical audience hands stay untouched. |
| Hero presents with both longer arms | The accepted 11-second anticipation/lift/hold/settle choreography, palms and all pose targets stay unchanged. Only the wrist connection side is corrected. |
| Active footer hide-and-seek | The accepted 18-second search/shield/reach/hide/peek/count/discovery choreography stays unchanged. Existing real wordmark remains the foreground occluder. Review full desktop/mobile loops and transitions. |
| Navbar always Ranca | Same identity and context controller. No Cana swap. |
| Existing social Ranca favicon | Reuse the exact approved Library favicon SVG, confirmed to contain the same paths/gradients as the current social-logo master. Only existing framing differs. Inspect native 16/32px raster outputs; ICO includes 16/32/48/64. No new drawing. |
| Preserve rendering and layout | Original body textures, distinct silhouettes/colors, no added body rim/outline, reduced-motion fallback, visibility pause/resume, ID/EN 320/390/desktop, mobile spacing/type and Flashcards. The separately approved existing social favicon retains its own original artwork. |
| Complete delivery | One package with before/after face closeups, static sections, enlarged hands, native favicon samples, full scenes and videos. Final-head CI must pass. PR26 remains draft; no merge/deployment. |

Results are recorded in `review-evidence/selected-A-website/static-review/report.json` and `report.json`. The preview artifact includes this checklist and the final commit in `BUILD.json`. Delivery requires actual visual inspection in addition to automated checks.

## Exact favicon provenance

Parent verified the current `https://x.com/rancanaid/photo` avatar against the existing social master on 2026-10-12. The master is Library `libfile_1089e58622d481919548e23ea761110c` (`Ranca-logo-reconstructed-vector.svg`); its paired 2048 PNG is `libfile_707e7ba7ce308191a01cd586dc5f1a14`. “Reconstructed” is its existing filename, not a request to redraw.

The user's already-approved sharper favicon is Library `libfile_7dab4c404eb48191aa4769569a4d9b2e` / `file_000000000e30822fba753b85ea28e05b`. Both complete SVGs were obtained through supported Library full-text reads, byte counts verified (3099/3115), and Library identity applied locally after binary materialization failed. All artwork paths/gradients match; differences are root dimensions and the outer framing transform only. The exact reused favicon SVG SHA256 is `b3633c8b979c5b05cc1219771efd5ccec63ddbeaad5d98a9b6ac626f3d4955b1`.

## Local visual and pixel review

Verified audience face closeups and desktop/mobile sections; non-face changed pixels: Ranca 0, Cana 0. Verified glasses face/accessory/pose closeup, enlarged resting/presenting/searching/covering/discovery hand contours, native 16/32px favicon previews, preserved source artwork and all unchanged choreography files. Full-loop lifecycle results and final-head CI are recorded with the delivered artifacts/PR.
