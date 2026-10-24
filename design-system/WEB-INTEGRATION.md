# Exact-value website integration — 24 October 2026

This change recovers the existing foundation into GitHub and connects a small set of exact values to existing website styles. It does not adopt the catalog's proposed component recipes or dark semantics. The ledger still contains 61 proposed assignments; production consumes only the eight allowlisted light values below. Existing layout, artwork, copy, typography sizes and weights remain unchanged.

## Recovery provenance

Source: Library review bundle `libfile_772ae3c8d4f881918e2a508014b09217`, version 1, `Rancana-foundation-review.zip`, materialized through the supported Library transfer flow. Its recorded foundation commit is `e0bc939cdbc1e1a0f99a25a5870479ddaab2f51e`, branch `codex/design-system-foundation-20261023`, baseline `cc49874833ffda0d957b1f8d257767dfc8793ccb`. That foundation branch was absent from GitHub at recovery, so this PR recovers source files rather than claiming the historical commit exists remotely.

- Bundle SHA-256: `b93668a91ceb33c20cebe4f6f3669ac1ed2ae8bec1b3ee58f7c33cd0f1145bbc`.
- Included source patch SHA-256: `e5f766e0c7c49d07f29d66a95c776f0872d10599dfe9899e86803c1002481a3e`.
- All 38 file hashes in the bundle's BUILD.json matched before recovery.
- All 11 recovered design-system files initially matched the bundle byte-for-byte; tokens.json, scoped tokens.css, components.css and APP-MAPPING.md remain unchanged. README now links this integration note. The generator also produces the production subset; the catalog test replaces its historical staging-diff restriction with separate live consumer validation.

The original reference documents describe their historical local-only scope. This note records the subsequent integration, without upgrading the proposed roles to a general design approval.

## Consumers

`styles.css` imports generated `foundation-tokens.css`. The latter exposes only namespaced `--rancana-foundation-*` properties. Existing legacy aliases retain their current values and existing consumers:

| Legacy aliases | Manifest token | Existing literal |
| --- | --- | --- |
| `--green-500` | `brand-green` | `#217957` |
| `--v-1000` | `color-text` | `#1e1e1e` |
| `--v-800`, `--v-700`, `--v-600` | `color-text-muted` | `#6f6f6f` |
| `--v-200` | `color-border` | `#e4e4e4` |
| `--v-50` | `color-bg` | `#f9f9f9` |
| `--green-700` | `color-primary-hover` | `#1b6447` |
| `--lora` | `font-heading` | `'Lora', Georgia, serif` |
| `--ssp` | `font-body` | `'Source Sans Pro', 'Helvetica Neue', sans-serif` |

The background alias does not replace the website's white body background. Existing danger/tangerine/neutral values outside this subset remain intact. The catalog stays excluded through `.assetsignore`; only the generated production subset is shipped. No product page imports components.css or catalog.css.

Regenerate with `npm run tokens:design-system`; validate freshness with `node scripts/generate-design-tokens.mjs --check`. `npm test` includes catalog and live consumer checks. The latter independently asserts pre-integration literal values on ID/EN homepages, Premium, articles and privacy at 320/390/1440px. Run `npm run test:staging` for the filtered asset build. Local browser tooling supports `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`.

## Scope and release gate

Integration starts from main `d0f22f7157b7078d5879bc135f42d625c865df12` in a separate worktree. Open PRs #36, #31, #28, #24 and #3 were inspected; none is included. #3 also changes styles.css; #24 overlaps README/package metadata. Their changes remain on their own branches. No HTML source, localized output, app repository or pending APK84 work is changed.

Merging main is production-affecting: its Cloudflare `Workers Builds: rancana` check records a production build/version, and GitHub Pages publishes `main:/`. Merge must wait for explicit production-deployment approval even after checks pass. No deployment configuration or permissions are changed here.

Flutter integration remains outstanding. No Dart generator, ThemeData wiring, app screen consumer or dark theme is implemented by this PR. APP-MAPPING.md records differences requiring separate review, including the app's current scaffold color, vision/selected palettes, scaled text and caption styles.
