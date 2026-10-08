# Rancana website

Static bilingual website deployed to the existing Cloudflare Worker `rancana` at https://rancana.id. `worker.js` serves the ASSETS binding and keeps the existing `/go/play` redirect and `/go/features` response. Hosting configuration is in `wrangler.toml`.

The root HTML files support the existing language switch. Generate the static `/id/` and `/en/` variants, canonical/hreflang metadata and sitemap with `python3 build-locales.py` (requires lxml). The sitemap includes Home, About, Help and Premium in both languages. Policy pages retain noindex and are excluded from the sitemap.

Run `node check-preview.mjs`, `node check-navigation.mjs` and `node check-anchors.mjs` for language, navigation and fragment checks. Review wrappers, tests, docs, source originals and review evidence are excluded from deployment using `.assetsignore`. Optimized WebP images and subset WOFF fonts are used by the pages; original assets remain in Git.

The public policy wording describes verified app behavior. Feedback is submitted to Firestore, planner records remain local, cloud profiles are separate, manual JSON backups are not encrypted, and Google Play processes paid subscriptions. Account-deletion submission is a request, not an automatic deletion operation; no completion deadline or cloud-retention period is promised.

Deploy only through the existing Cloudflare account and Worker. Keep deployed version and commit receipts so a release can be rolled back without changing routes or bindings.
