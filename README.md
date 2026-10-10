# Rancana website

Static bilingual website deployed to the existing Cloudflare Worker `rancana` at https://rancana.id. `worker.js` serves the ASSETS binding and keeps the existing `/go/play` redirect and `/go/features` response. Hosting configuration is in `wrangler.toml`.

The root HTML files support the existing language switch. Generate the static `/id/` and `/en/` variants, canonical/hreflang metadata and sitemap with `python3 build-locales.py` (requires lxml). The sitemap includes Home, About, Help, Premium, Articles, Class Schedule, To-do Guide and Flashcard Guide in both languages (16 URLs from 22 locale pages). Policy pages retain noindex and are excluded from the sitemap. The Articles hub links three practical Android product walkthroughs. Existing college-schedule and flashcard-guide URLs remain valid; creation and practice share one flashcard article. Keep both translations complete when updating articles. App illustrations are identified as illustrations rather than current UI screenshots. Source/asset evidence is in `review-evidence/ARTICLE-HANDOFF.md`.

Run `node check-preview.mjs`, `node check-navigation.mjs` and `node check-anchors.mjs` for language, navigation and fragment checks. Review wrappers, tests, docs, source originals and review evidence are excluded from deployment using `.assetsignore`. Optimized WebP images and subset WOFF fonts are used by the pages; original assets remain in Git.

The public policy wording describes verified app behavior. Feedback is submitted to Firestore, planner records remain local, cloud profiles are separate, manual JSON backups are not encrypted, and Google Play processes paid subscriptions. Account-deletion submission is a request, not an automatic deletion operation; no completion deadline or cloud-retention period is promised.

Deploy only through the existing Cloudflare account and Worker. Keep deployed version and commit receipts so a release can be rolled back without changing routes or bindings.

## Website analytics (prepared for review)

The existing website stream is `G-2KDN1C2G3L` (property 534594107, WEB stream 15938604446), separate from Android stream 15350893243. The ID is public, not a credential. No account settings were changed.

`analytics-consent.js` loads the standard Google tag in the main document only after valid persisted affirmative consent. No iframe transport ships. Unknown, rejected, expired, corrupt or unavailable storage fails closed. Consent persists for up to 180 days. Deadline, focus, visibility and explicit-event checks revalidate it. Suspension can delay client timers.

Revocation disables this measurement ID synchronously, persists denial, removes host-only `rancana_ga*` cookies and reloads the document to unload executed SDK code. Expiry and cross-tab revocation do the same once observed. Already initiated requests cannot be recalled. If saving a choice fails, collection is disabled in the current tab without reloading into an old saved grant; the panel explains that the user must clear site browser data to keep it off across navigation. Reload is necessary because removing a script element cannot unload executed JavaScript. BFCache restoration rechecks consent and preserves valid cookies without duplicating the current manual view.

Application events are canonical `page_view` and `google_play_click` with fixed placement header/hero/footer/body. This is not a claim that the SDK sends only two event types. Standard first_visit/session_start/user_engagement and pseudonymous browser/session identifiers may be collected. Application event page fields exclude raw queries/fragments; universal absence of URL/campaign-derived information is not verified. No user_id, user properties, account identifiers, email or form text are intentionally supplied. Play click means attempted navigation, not install or purchase. Existing navigation is never delayed; delivery is best effort.

Code configures send_page_view:false on every document; canonical page title/location and empty referrer; allowlisted language; Google signals and ad personalization false; all advertising consent denied; analytics consent granted only after acceptance; host-only prefixed cookies with 180-day expiry and cookie_update:false. Locale changes refresh stream config with update:true and send_page_view:false. Full document navigation records a new view; hash/query changes alone do not trigger our manual views.

### Admin prerequisite — verified by owner on 9 October 2026 at 13:14 UTC

The owner verified these saved settings after a full reload, in property 534594107 → Data streams → WEB stream 15938604446 → Enhanced measurement settings:
- OFF: Page views → advanced → Page changes based on browser history events.
- OFF: Scrolls, Outbound clicks, Video engagement and File downloads.
- OFF: Site search and Form interactions (unchanged).

send_page_view:false suppresses initial config views but does not suppress independently enabled enhanced-measurement history views. There is no documented site-code equivalent that disables every enabled enhanced-measurement feature. These settings were applied separately from the source change. This implementation does not modify them. Ordinary initial page-load views are suppressed in code. The internal-traffic filter remains Testing, not active exclusion; filter activation is a separate decision.

### Validation and release gate

`npm ci` and `npx playwright install chromium` install the pinned test tooling/browser; `npm test` runs all checks, including article routes/assets/schema and desktop/mobile QA (`check-articles.mjs`). To use an existing Chromium, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium. `node check-analytics.mjs` runs Chromium against a local server with every Google SDK and collection request intercepted. The fake SDK respects the disable flag but cannot establish real SDK payloads, automatic-event behavior or ingestion. No live GA traffic is sent by these tests. Existing checks: node check-preview.mjs, node check-navigation.mjs and node check-anchors.mjs.

Do not publish until actual network behavior is reviewed in an authorized preview: reject → no Google requests; accept → correct web ID, one canonical manual view, examine ALL automatic-event and query/campaign parameters; navigate/change locale/click Play → expected bounded manual events; revoke → cookies cleared, document reloaded, no further collection. Confirm actual CSP and report receipt. Real network verification is blocked in this environment by proxy HTTP 403, and Library artifact upload was blocked by its hosted-tool network failure.

References: [manual pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views), [enhanced measurement](https://support.google.com/analytics/answer/9216061?hl=en), [configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [basic consent](https://support.google.com/tagmanager/answer/14009635?hl=en), [CSP](https://developers.google.com/tag-platform/security/guides/csp).

GitHub Actions also runs `node check-analytics-real.mjs`: it downloads the real Google SDK but intercepts all collection requests and blocks other external destinations. Its report records bounded event/context fields and parameter names, not browser IDs. A passing run establishes the observed SDK behavior for those scenarios, not live GA ingestion. Screenshots and the SDK report are retained as CI artifacts. No production deployment occurs in the workflow.

## Ranca and Cana website artwork

This draft previews the selected soft-gradient cloud Ranca and Cana, with their original white outlined faces and hands, in the homepage hero and shared white footer. The final download CTA remains text/button only. Production header/footer branding, favicons, wordmark, copy, paper and Aurora sheet artwork are retained.

The transparent cutouts come from the selected master image through background-only alpha cleanup, without identity regeneration. Two lossless WebPs total 345,588 bytes and are reused in both locations. The cutouts sit directly on the existing paper and white footer, without an added wash, colored shadow or glow. White outlined hands remain unchanged and can be faint on white. Images are decorative, dimensioned, pointer-inert and footer copies lazy-load. No mascot animation is added.

`node check-mascots.mjs` checks both languages at 320, 390, 768, 900, 1440 and 1920 px, validates non-overlapping links/CTA hit targets, image budgets, original branding, paper/Aurora sheet artwork and white footer, and saves hero/CTA/footer screenshots under `review-evidence/`. It runs in the existing `npm test` workflow. Review screenshots before publishing.
