# Rancana staging preview

Target: https://staging.rancana.id, using the separate Cloudflare Worker `rancana-staging`. Production remains the existing `rancana` Worker and `wrangler.toml`. This is a public testing site, not a private environment; robots controls discourage indexing but do not authenticate visitors.

## Included work

The `staging` branch starts at main `4997ae9`, includes the reviewed bilingual study-week guide (`cb2e6fb`), and the isolated campaign-attribution changes (`5994dc5`, `b55f82c`, cherry-picked here). PR28 pricing, PR24 branding and PR3 badges remain separate review work. Do not merge them blindly into staging or production.

The staging artifact replaces the analytics loader and config with inert files. It sends no production GA4, PostHog, replay or campaign-referrer traffic, including when this origin already has granted consent. Campaign behavior remains testable with intercepted local tests, not live collection. Production source retains the reviewed consent implementation. Website clicks do not establish app installs or identity joins.

## Build and check

Use Node 22 and Python 3:

```sh
npm ci
npx playwright install --with-deps chromium
npm test
node check-play-redirect.mjs
npm run build:staging
npm run test:staging
```

For existing system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. The staging build copies tracked public files only, respects `.assetsignore`, preserves source HTML, adds a testing notice and robots meta tags, and omits the sitemap. Evidence and SHA256 asset manifest go to `review-evidence/staging/`, never the public asset directory. The Worker adds robots/no-store/referrer/CSP headers to assets, redirects, errors and 204 responses. `run_worker_first=true` is essential: default asset-first routing would bypass Worker headers. The Worker rejects production and unknown hosts.

The GitHub `Staging preview artifact` workflow runs on `staging` pushes and explicit dispatch of that branch, then retains the tested artifact. It has read-only repository permissions and no deploy secrets. It does not deploy automatically.

## Separate Cloudflare deployment

Only after existing authenticated Cloudflare access and the staging-only destination have been verified:

```sh
npm run deploy:staging
```

This uses pinned Wrangler 4.151.1 with explicit `wrangler.staging.toml`, never the production configuration. It creates/updates only `rancana-staging` and its exact custom hostname. Do not substitute `rancana`, root/www routes or wildcard routes. The custom domain must not already belong to another resource. `workers.dev` and preview URLs are disabled in this config.

For a reusable Cloudflare Git build, the parent account setup must attach a separate Worker to the repository's `staging` branch. Use build command `npm ci && npm run build:staging` and deploy command `npx --yes wrangler@4.151.1 deploy --config wrangler.staging.toml`. Ensure final-head GitHub staging checks pass before deployment; Cloudflare build execution alone does not establish those results. Disable deploying other branches on the staging Worker. Do not change the existing production build. Do not create credentials or change permissions as part of this workflow.

Review coherent changes on their feature branches, then integrate approved preview changes into `staging`, run checks, and deploy that exact staging head. Never merge staging infrastructure into production as a release shortcut. Account-level injected Web Analytics or Zaraz must not introduce collection on staging; verify the live network after deployment, without modifying production account-wide settings.

## Verify and recover

After deployment, record Worker version/deployment ID and source commit. Check HTTPS, staging hostname, both locales, study-week text, mobile/desktop layouts, robots meta, `robots.txt`, absent sitemap, `X-Robots-Tag` on HTML/assets/redirects/404s, and zero analytics/replay requests even with granted consent. Confirm root/www production routes and Worker version remain unchanged. A local stub/preview does not prove deployed Cloudflare behavior.

Rollback only the `rancana-staging` deployment to its previously recorded version. Preserve production routes, versions and bindings. Local recovery is available from the exported Git bundle and patch; generated `dist-staging/` can be rebuilt. No remote deployment or route change is implied by a successful local build.

Official references: [static assets binding and Worker-first routing](https://developers.cloudflare.com/workers/static-assets/binding/), [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).
