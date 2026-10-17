# Campaign attribution review

Base: `4997ae9b86b75d2ec7afe0a5bd7870e699f8573c` (latest main verified 2026-10-16).
Shared for Git review on a non-production Cloudflare preview branch. No PR, deployment to the custom staging hostname, app modification, external campaign publication, or live analytics configuration change is included.

## Behavior

Only complete, exact registry tuples are accepted. Campaign is `rancana_study_2026q4`; sources are `instagram`, `tiktok`, `x`. Medium distinguishes `organic_social` from `paid_social`. Content is limited by source/medium (see proposed links below). Duplicate/missing/unsupported values invalidate the entire tuple. Unknown parameters are ignored, never copied. These tags describe a proposed placement, not proof that the visitor came from that platform; anyone can copy a public tagged link.

Consent is required for GA4. Accepted tags still survive same-origin page and locale navigation in `sessionStorage`, without decorating internal links, but are retained only as GA event context. Storage contains only four allowlisted campaign fields, schema version, creation timestamp and the existing consent-decision timestamp. No raw URLs, referrers, personal data, click IDs or user identifiers are stored. No campaign is stored before consent.

A fixed 30-minute maximum lifetime starts at campaign acceptance; untagged navigation and same-campaign reloads do not extend it. A different valid tagged landing starts a new campaign window. Explicit malformed/unsupported campaign tags clear prior attribution. Expiry, withdrawal, missing/expired consent and changed consent timestamp invalidate and remove the record. Every outbound event revalidates it, with a timer and focus/visibility checks for open or suspended pages. Failed session storage disables campaign context while normal navigation and consented non-campaign analytics continue. A later grant on an untagged page cannot resurrect withdrawn campaign data; a freshly granted tagged landing may accept its current valid tags anew.

Browser tab-session storage survives reloads; closing the tab normally clears it. Browser restores or opener-created duplicate tabs may copy/restore session state, but the original fixed expiry and current consent checks still apply. Independent tabs do not share campaign storage. See [sessionStorage behavior](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage). Storage is origin-bound, so this does not join subdomains, browsers, devices or app identities.

The existing query-free canonical `page_location` and blank `page_referrer` remain. Explicit GA4 campaign fields carry only registry values; unsupported campaign fields are blank. Website config remains `G-2KDN1C2G3L`, website stream **15938604446** under property **534594107**. App stream **15350893243** is separate: do not combine its first opens with website clicks as if they are the same event.

Every Play CTA points to `/go/play`; the client leaves that href unchanged. The Worker accepts only the first `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` values, lowercases and validates them against `[a-z0-9_.-]{1,64}`, applies defaults (`rancana.id`, `web`, `play_cta`), and builds one encoded Play `referrer` server-side. All other query parameters are ignored, and the 302 response is `no-store`. This attribution path has no consent dependency and works for no-JS visits. Navigation is not delayed for analytics. One trusted primary/keyboard click or middle click emits one custom `google_play_click`; synthetic clicks and repeated script loads do not add events.

## Proposed links — review only, not published

The campaign name and placement choices below are proposals. Review naming before publication; new campaigns require changing the registry in code. Use the matching placement, never a paid tag on an organic link.

| Source | Medium | Placement | Proposed Indonesian landing link |
|---|---|---|---|
| instagram | organic_social | profile_bio | [Review link](https://rancana.id/id/?utm_source=instagram&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=profile_bio) |
| instagram | organic_social | story | [Review link](https://rancana.id/id/?utm_source=instagram&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=story) |
| instagram | paid_social | feed_ad | [Review link](https://rancana.id/id/?utm_source=instagram&utm_medium=paid_social&utm_campaign=rancana_study_2026q4&utm_content=feed_ad) |
| instagram | paid_social | story_ad | [Review link](https://rancana.id/id/?utm_source=instagram&utm_medium=paid_social&utm_campaign=rancana_study_2026q4&utm_content=story_ad) |
| tiktok | organic_social | profile_bio | [Review link](https://rancana.id/id/?utm_source=tiktok&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=profile_bio) |
| tiktok | paid_social | video_ad | [Review link](https://rancana.id/id/?utm_source=tiktok&utm_medium=paid_social&utm_campaign=rancana_study_2026q4&utm_content=video_ad) |
| x | organic_social | profile_bio | [Review link](https://rancana.id/id/?utm_source=x&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=profile_bio) |
| x | organic_social | post | [Review link](https://rancana.id/id/?utm_source=x&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=post) |
| x | paid_social | feed_ad | [Review link](https://rancana.id/id/?utm_source=x&utm_medium=paid_social&utm_campaign=rancana_study_2026q4&utm_content=feed_ad) |

For English, use `/en/` with the same tags. No live posts, profiles, ads or links were altered.

## Official semantics checked before implementation

- [Google Analytics app attribution](https://support.google.com/analytics/answer/10311900?hl=en): Firebase runs after opening the app; Play referrals are one attribution mechanism. A generic Play referrer is not sufficient evidence of a platform-specific campaign. Manual `campaign_details` has separate first-install semantics.
- [Automatically collected events](https://support.google.com/analytics/answer/9234069?hl=en): `first_open` is first launch after installation/reinstallation, not a raw download.
- [Google Play Install Referrer API](https://developer.android.com/google/play/installreferrer): provides referral content and installation/click timing through the Play app. This website change does not implement or verify app-side retrieval.
- [GA4 configuration fields](https://developers.google.com/analytics/devguides/collection/ga4/reference/config): `campaign_source`, `campaign_medium`, `campaign_name`, `campaign_content` override the corresponding URL campaign values.

Website clicks do not prove installs, and sharing a GA4 property does not automatically join a browser to an app installation. There is no cross-platform identity join here. No claim is made that mascot exposure causes conversion or retention changes.

## Overlapping PR review

Open PRs at inspection: #28 (premium pages/resource.css), #24 (homepage/branding/locales, README and package.json among other UI files), #3 (Play badge assets/index.html/styles.css/check-lang.mjs). This change is limited to analytics-consent.js, worker.js, the Play CTA hrefs, related checks and this review note. All original workspace edits remain untouched in `/workspace/rancana-web`; implementation is isolated on this review branch.

## Validation and remaining release gates

Run `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome node check-analytics.mjs`, `node check-play-redirect.mjs`, package tests and mascot/mobile checks. Browser tests stub Google and check consent, withdrawal, failed persistence, expiry, parameter injection, unsupported/duplicate values, both locales, canonical metadata, outbound event deduplication, middle-click handling and unchanged `/go/play` hrefs. See accompanying evidence logs for actual outcomes.

The real-SDK test was expanded to verify campaign fields and reject raw click IDs in collection payloads. This environment could not load Google's SDK (zero SDK responses; direct diagnostic download returned HTTP 403), so actual SDK serialization is **unverified**. No GA collection was forwarded. Do not release on the stub result alone. In an allowed environment, run `npm run test:real-sdk` with collection interception and confirm no arbitrary UTM values, click IDs, query text or referrer leaks, no enhanced-measurement duplicate click, and exactly one custom outbound event.

Then, with separately authorized test collection and an eligible Play-delivered app build: click a distinct approved test campaign, inspect the decoded Play referrer, install/open, and verify the app's Firebase campaign/first_open dimensions in app stream 15350893243. Test a fresh install, reinstall, existing install, denial/withdrawal, and return on day 1/day 7. Confirm collection consent and Firebase behavior in the separate app task. Compare aggregate campaigns with web stream 15938604446; do not infer a person-level join or treat click counts as install counts. No app SDK addition is warranted until this existing route is tested.

## Recovery

Apply the exported patch only to a clean checkout of the recorded base with `git apply --check campaign-attribution.patch` before `git apply campaign-attribution.patch`. Reverse with `git apply -R --check` then `git apply -R` against the same unmodified changes. The original worktree is preserved. No repository commit is required to review this patch.
