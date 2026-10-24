# Website foundation inventory

Read-only source audit on 2026-10-23 against `/Users/macbook/Downloads/FOUNDATION.md`. Repository: `/Users/macbook/Documents/Codex/2026-10-23/task/rancana-foundation`; verified HEAD `cc49874833ffda0d957b1f8d257767dfc8793ccb`. Read AGENTS.md, REVIEW-CHECKLIST.md, and MASCOT-REFERENCES.md first. No repository source edits or browser/desktop operations were performed. This report is the only written deliverable.

## Findings

The website inventory in FOUNDATION.md is accurate at this baseline. All seven root CSS files, complete root properties, fonts, direct-hex totals, and quoted spacing/radius frequencies reproduce exactly. There is no existing dark scheme in these files. The proposed light semantic role names are new mappings; they are not current production tokens.

### Root properties

Only `styles.css` has a `:root` block (lines 29–45), containing 14 declarations:

| Property | Literal value |
|---|---|
| --v-1000 | #1e1e1e |
| --v-800 | #6f6f6f |
| --v-700 | #6f6f6f |
| --v-600 | #6f6f6f |
| --v-200 | #e4e4e4 |
| --v-100 | #f0f0f0 |
| --v-50 | #f9f9f9 |
| --green-700 | #1b6447 |
| --green-500 | #217957 |
| --tangerine | #ff9a40 |
| --danger | #f00 |
| --lora | 'Lora', Georgia, serif |
| --ssp | 'Source Sans Pro', 'Helvetica Neue', sans-serif |
| --bleed | 0px |

The three v600/v700/v800 names share one literal. Website green700 corresponds to the proposal's primary-hover #1B6447, while the app audit calls it Aurora c600. Avoid treating numeric ramp names as equivalent across platforms. Brand pink #FF197D is absent from website root variables. Root danger #F00 differs from the proposed error foreground #D60000; this is a deliberate semantic choice, not an exact rename.

### Fonts and dark scheme

`styles.css:4–26` registers four local WOFF files with font-display:swap: Lora Medium 500 (32,552 bytes), Lora SemiBold 600 (32,628), Source Sans Pro Regular 400 (25,012), and Source Sans Pro SemiBold 600 (25,000). Corresponding TTF assets also exist. There is no registered Lora 400 or Source Sans Pro 500. The body uses --ssp. The h1/h2/h3/p/strong reset at styles.css:82 sets weight 400; article headings at articles.css:1 specify Lora without consistently overriding this weight. Therefore “all existing headings are Lora 600” would be inaccurate. Catalog type recipes can explicitly choose 600 as a derived proposal.

Comment-stripped inspection found zero prefers-color-scheme, color-scheme, data-theme, or .dark markers across all seven files. Dark assignments in FOUNDATION.md must remain labeled new proposals; no production dark behavior was verified or inferred.

### Direct hex counts

Block comments excluded. Declarations were enumerated rather than matching selectors. Hex matches used `#[0-9a-fA-F]{3,8}\b`; short forms expand, case normalizes, and alpha remains. Direct literals exclude custom-property declarations. “Unrepresented” compares each direct literal against the combined literal set in all custom-property declarations. Named colors and rgb()/rgba(), inline HTML, SVG, and JS were excluded.

| File | Direct hex occurrences | Unrepresented occurrences |
|---|---:|---:|
| analytics-consent.css | 13 | 9 |
| articles.css | 58 | 53 |
| companion-motion.css | 1 | 1 |
| footer-links.css | 10 | 2 |
| preview.css | 39 | 29 |
| resource.css | 70 | 43 |
| styles.css | 22 | 22 |
| **Total** | **213** | **159** |

Unrepresented normalized distinct colors: **78**. Excluding analytics-consent.css: **200** direct and **150** unrepresented, exactly as documented. Nine unique normalized hex values occur in custom-property values: #1b6447, #1e1e1e, #217957, #6f6f6f, #e4e4e4, #f0f0f0, #f9f9f9, #ff0000, #ff9a40. A direct #217957 still counts as a hardcoded occurrence.

### Repeated geometry counts

All values quoted in FOUNDATION.md reproduce. Spacing counts: 24px 78; 20px 42; 12px 40; 28px 38; 32px 32; 16px 25; 8px 23; 40px 20; 14px 16; 80px 15; 4px 14; 64px 14. Border-radius counts: 24px 9; 20px 6; 999px 6; 16px 4; 12px 4; 14px 4; 18px 3; 28px 3; 64px 3; 32px 2; 26px 2; 4px 2. Each px component is counted; shorthands and later overrides remain separate occurrences. These are lexical counts, not rendered usage.

## Exact static asset recommendations

Use the existing selected-A SVGs as external img sources for the local catalog; preserve their original bytes, aspect ratios, colors, texture, silhouette, and facial identity. No export or rig change is needed. The simple identity pair is:

| Asset | Intrinsic size | SHA256 |
|---|---|---|
| assets/mascots/selected-A/ranca-rest.svg | 741 × 532 | 6853c96fccfda2a40d9466cae58874785b07a39ae60a3757693d52f2c04cf48f |
| assets/mascots/selected-A/cana-rest.svg | 745 × 528 | 76a59f663ee214e25a0796ce98104a0975d5017e88b5d0c73cb206dc789b9446 |

These are the existing hero/footer no-JS and reduced-motion fallbacks, exported by scripts/export-mascot-assets.mjs from the shared rig. Each embeds its original body image; both declare selected design A and normal-open eyes. Neither contains script, animation elements, or keyframes. Keep the catalog static and independent of companion-motion.js / mascot-rig.js runtime mounting. If used as decorative context, give img an empty alt; if demonstrating identity, name Ranca and Cana explicitly in adjacent text/alt. Navbar identity remains Ranca.

Optional contextual samples, also fully static and already present in index.html:

| Asset | Intrinsic size | Appropriate context |
|---|---|---|
| assets/mascots/selected-A/ranca-school.svg | 244 × 320 | School audience; canonical backpack/body/hands and face-only update |
| assets/mascots/selected-A/cana-college.svg | 236 × 320 | College audience; canonical cap/body/hands and face-only update |
| assets/mascots/selected-A/cana-sunglasses.svg | 745 × 528 | Benefits; purposeful glasses-adjusting static pose |

The school/college SVG metadata explicitly declares data-face-only=true. Do not substitute raw old audience WebPs for these approved face-updated compositions. Do not crop away costumes, rebuild hands, add outlines/filters/brows, or reinterpret the social favicon as the general mascot source. Static asset export scripts were inspected but not executed.

## Remaining limitations

No discrepancy was found in the supplied website numeric inventory. This audit does not validate the Flutter repository, production rendering, runtime contrast, responsive layout, or actual image appearance. No blocked/denied operations occurred. All source work remains with the implementation owner; catalog files added later should be excluded from any baseline recount or reported separately.
