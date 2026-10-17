const PLAY =
  'https://play.google.com/store/apps/details?id=com.planora.labs';
const UTM_VALUE = /^[a-z0-9_.-]{1,64}$/;

const validValue = (params, key) => {
  const value = params.get(key)?.toLowerCase();
  return value && UTM_VALUE.test(value) ? value : null;
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/go/play') {
      const referrer = new URLSearchParams({
        utm_source: validValue(url.searchParams, 'utm_source') || 'rancana.id',
        utm_medium: validValue(url.searchParams, 'utm_medium') || 'web',
        utm_campaign: validValue(url.searchParams, 'utm_campaign') || 'play_cta',
      });
      const content = validValue(url.searchParams, 'utm_content');
      if (content) referrer.set('utm_content', content);
      const destination = new URL(PLAY);
      destination.searchParams.set('referrer', referrer.toString());
      return new Response(null, {status: 302, headers: {
        Location: destination.href,
        'Cache-Control': 'no-store',
      }});
    }
    if (url.pathname === '/go/features') return new Response(null, { status: 204 });
    return env.ASSETS.fetch(request);
  },
};
