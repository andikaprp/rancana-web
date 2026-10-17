const PLAY =
  'https://play.google.com/store/apps/details?id=com.planora.labs';
// Format-only validation. There is deliberately no campaign-name allowlist,
// so new campaigns work without a deploy.
const UTM_VALUE = /^[a-z0-9_.-]{1,64}$/;
const DEFAULTS = {utm_source: 'rancana.id', utm_medium: 'web', utm_campaign: 'play_cta'};
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
    const response = await env.ASSETS.fetch(request);
    return previewHost ? preventIndexing(response) : response;
  },
};
