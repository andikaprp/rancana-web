const PLAY =
  'https://play.google.com/store/apps/details?id=com.planora.labs';
// Format-only validation. There is deliberately no campaign-name allowlist,
// so new campaigns work without a deploy.
const UTM_VALUE = /^[a-z0-9_.-]{1,64}$/;
const DEFAULTS = {utm_source: 'rancana.id', utm_medium: 'web', utm_campaign: 'play_cta'};
// Short campaign paths that permanently move to their canonical locale page.
// The query string is kept so campaign parameters survive the redirect.
const PERMANENT_REDIRECTS = new Map([
  ['/', '/id/'],
  ['/index.html', '/id/'],
  ['/tka-2026', '/id/tka-2026'],
  ['/tka-2026/', '/id/tka-2026'],
  ['/jadwal-belajar-ujian', '/id/jadwal-belajar-ujian'],
  ['/jadwal-belajar-ujian/', '/id/jadwal-belajar-ujian'],
]);
const CANONICAL_HOST = 'rancana.id';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const movedPermanently = location => new Response(null, {status: 301, headers: {Location: location}});
// www.rancana.id and plain http move to https://rancana.id with the same path and query.
// Local development hosts are left alone so `wrangler dev` keeps working over http.
const canonicalOrigin = url => {
  const host = url.hostname.toLowerCase();
  const www = host === 'www.' + CANONICAL_HOST;
  const insecure = url.protocol === 'http:' && !LOCAL_HOSTS.has(host);
  if (!www && !insecure) return null;
  const target = new URL(url);
  target.protocol = 'https:';
  target.port = '';
  if (www) target.hostname = CANONICAL_HOST;
  return movedPermanently(target.href);
};
const permanentRedirect = url => {
  const target = PERMANENT_REDIRECTS.get(url.pathname);
  return target ? movedPermanently(new URL(target + url.search, url.origin).href) : null;
};
// Static assets send text/html without a charset; declare UTF-8 explicitly.
const withCharset = response => {
  const type = response.headers.get('content-type');
  if (!type || !/^text\/html\b/i.test(type) || /charset=/i.test(type)) return response;
  const headers = new Headers(response.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
};
const isPreviewHost = hostname => hostname === 'staging.rancana.id' ||
  hostname.endsWith('.workers.dev') || hostname.endsWith('.pages.dev');

const preventIndexing = response => {
  const headers = new Headers(response.headers);
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
};

const validValue = (params, key) => {
  const value = params.get(key)?.toLowerCase();
  return value && UTM_VALUE.test(value) ? value : null;
};

// Source, medium and campaign are all-or-nothing: if any is missing or invalid,
// all three defaults are used. Content is optional and only kept with a complete tuple.
const playReferrer = params => {
  const source = validValue(params, 'utm_source');
  const medium = validValue(params, 'utm_medium');
  const campaign = validValue(params, 'utm_campaign');
  if (!source || !medium || !campaign) return new URLSearchParams(DEFAULTS);
  const referrer = new URLSearchParams({utm_source: source, utm_medium: medium, utm_campaign: campaign});
  const content = validValue(params, 'utm_content');
  if (content) referrer.set('utm_content', content);
  return referrer;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const previewHost = isPreviewHost(url.hostname.toLowerCase());
    const moved = url.pathname.startsWith('/go/') ? null : canonicalOrigin(url);
    if (moved) return previewHost ? preventIndexing(moved) : moved;
    if (url.pathname === '/go/play') {
      const destination = new URL(PLAY);
      destination.searchParams.set('referrer', playReferrer(url.searchParams).toString());
      const response = new Response(null, {status: 302, headers: {
        Location: destination.href,
        'Cache-Control': 'no-store',
      }});
      return previewHost ? preventIndexing(response) : response;
    }
    if (url.pathname === '/go/features') {
      const response = new Response(null, {status: 204});
      return previewHost ? preventIndexing(response) : response;
    }
    const redirect = permanentRedirect(url);
    if (redirect) return previewHost ? preventIndexing(redirect) : redirect;
    const response = withCharset(await env.ASSETS.fetch(request));
    return previewHost ? preventIndexing(response) : response;
  },
};
