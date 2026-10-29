# Rancana foundation — reference 01

**Current integration:** see [WEB-INTEGRATION.md](WEB-INTEGRATION.md). The historical reference below remains proposed; eight exact-value tokens now feed ten existing web aliases without adopting component recipes or dark semantics.

Status: **implemented and tested as a local reference only; semantic token set proposed, not founder-approved, not adopted by shipped screens, not released**. Scope: one Aurora light website catalog. No app code, dark theme, production layout, artwork or account changes.

## Read this before designing

1. Read repository AGENTS.md, REVIEW-CHECKLIST.md and MASCOT-REFERENCES.md. Read the [current website inventory](WEB-INVENTORY.md), [app mapping and source boundaries](APP-MAPPING.md), and [token ledger](tokens.json).
2. Preserve the anchors: green #217957, pink #FF197D, Lora 600 heading identity, Source Sans Pro body, original approved Ranca/Cana assets. Check actual selector weights: existing article headings do not all use 600.
3. Use semantic roles deliberately. EXISTING describes a literal's provenance, not approval of its new name or role. All 61 assignments in the manifest remain proposed. DERIVED means a translation; NEW-PROPOSAL means a new value/behavior. Dark values are data-only proposals.
4. Follow the [reference evidence and page-variant review protocol](PAGE-REVIEW-PROTOCOL.md) for later adoption: record references, obtain agreement on one real page/light pilot, compare 2–3 compositions, polish manually and record the founder's choice. This catalog does not authorize a global migration or select a pilot.
5. Keep subject classifications, feedback roles, personalized/vision palettes and illustrative colors distinct. Inspect consumers before replacing legacy blue. Keep shipped responsive sizes, app .sp/text scaling and localized content until explicitly reviewed.
6. Use the existing selected-A static SVGs/rig exports. Preserve original bodies, texture, hands, lashes and silhouettes. Ranca remains the navbar identity. Do not generate substitute illustrations.

## Baseline and isolation

GitHub read-only verification on 2026-10-23 confirmed website staging **cc49874833ffda0d957b1f8d257767dfc8793ccb**, matching Muse's RAN-53 claim. Website main was **d0f22f7157b7078d5879bc135f42d625c865df12**. The separate RAN-53 deployment/Linear instructions were not executed.

The implementation lives on `codex/design-system-foundation-20261023`, isolated from a fresh clean staging clone in a separate worktree. Existing local app checkouts and user edits were inspected read-only and preserved. App remote main/staging and exact matching foundation blobs are recorded in APP-MAPPING.md; main was not assumed current.

The uploaded FOUNDATION.md and HANDOVER-chatgpt.md were read from local Downloads copies, with the parent's authenticated FOUNDATION text as corroborating reference. Original tokens.css and tokens-dart.md were unavailable; this manifest was reconstructed from FOUNDATION section 4's 61-row table. It does not claim byte identity with Muse's missing sketches.

## Run the local catalog

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/design-system/`. Use localhost because the ledger fetches tokens.json; opening index.html as a file may block that fetch. This is a local reference, not a published preview. There are no analytics scripts, account actions, storage writes, remote fonts or external requests.

## Files and opt-in recipes

- `tokens.json` is the 61-name review ledger: light values, unused dark proposals, literal provenance, proposed assignment status and source reference. It is not a production token API.
- `tokens.css` is deterministically generated from light values and scoped to `.rancana-foundation`. It contains no global :root or dark override.
- `components.css` supplies opt-in `.ds-button`, `.ds-card`, `.ds-tag`, `.ds-field`/`.ds-input`, `.ds-subject` and `.ds-heading` recipes within that scope.
- `index.html`, `catalog.css` and `catalog.js` compose the internal catalog. Do not import catalog.css into a product page.
- `WEB-INVENTORY.md` and `APP-MAPPING.md` record fresh evidence and adoption limits for both agents.
- `PAGE-REVIEW-PROTOCOL.md` connects Faiz's authored workflow to Rancana's future reference/variant review process; the implemented catalog and recommended next pilot remain separate.

Example reference markup:

```html
<section class="rancana-foundation">
  <article class="ds-card">
    <h3 class="ds-heading">A sample study card</h3>
    <button class="ds-button" type="button">Continue</button>
  </article>
</section>
```

This example shows the API; it is not an instruction to install the reference layer on existing pages. Subject variants and editorial layout remain in catalog.css until the first component adoption is agreed.

`design-system/` is excluded in `.assetsignore`. Existing production HTML/CSS/JS and asset bytes are untouched. The staging build must contain zero design-system files. No production page links to the catalog.

## Concrete choices in this slice

| Choice | Recommendation / status |
|---|---|
| New semantic aliases for existing colors | Proposed only. Green as the reference primary action is a new web role; shipped Play CTAs remain dark. |
| Pink text pairing | Proposed #1E1E1E text on #FF197D; white on this pink fails ordinary small-text contrast. Fixed brand pink is preserved. |
| Card A / Comfortable | Suggested editorial web default: 24px inset, 24px radius, translated AppShadows shadow. Not adopted. |
| Card B / Compact | Alternative: 16px inset, 16px radius, same content and colors. Not adopted. |
| Buttons | Proposed SSP600/16px reference, 52px minimum height, pill shape; differs from existing website Lora600/17px pills. Hover uses #1B6447. |
| Keyboard focus | Proposed 3px green outline with 4px gap. A component recipe choice, not an approved global token. |
| Typography recipes | Lora600, 1.3 headings; SSP400, 1.5 body. SSP captions are a proposed role. Catalog cover title 48–80px and responsive arrangement are catalog-only composition choices. Existing screens retain their own responsive scales. |
| Paper / characters | Reuse paper.webp and selected-A rest SVGs byte-for-byte. Cover composition/copy is review material. |
| Dark / elevation | Dark semantics and Material 0/2 elevation remain data-only proposals. No dark CSS/Flutter theme is implemented. |

Founder decisions remain: approve/amend light roles; choose A/B geometry and button type treatment; pick one first adoption page; later review dark semantics/app integration and release. Pen.dev/DialKit choice is independent and unresolved. Neither was installed or purchased.

## Validate and review

```sh
npm run tokens:design-system
node scripts/generate-design-tokens.mjs --check
npm run test:design-system
npm run build:staging
npm run test:staging
node check-selected-website-mascots.mjs --no-video
```

The catalog check uses the existing pinned Playwright dependency and a headless Chromium with a localhost-only server. It captures desktop/mobile PNGs in ignored `review-evidence/design-system/`, tests 320/390/1440px layout, asset/font loading, token filtering, local button response, hover and visible keyboard focus, and checks named light text/background pairs at 4.5:1. It blocks external requests. This is targeted verification, not a complete accessibility certification. Disabled-state contrast, images/textured backgrounds and all future use contexts are not inferred from token pairs.

App visual acceptance requires real Flutter captures. No Flutter screens were rendered or changed for this task. No push, merge, deployment, Linear/Notion update, account setting change, package purchase or Play action is authorized by these files.
