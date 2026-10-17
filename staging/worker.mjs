// Dedicated staging entrypoint. Never attach this Worker to production hosts.
export const headers = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'",
};
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let response;
    if (!['staging.rancana.id', 'localhost', '127.0.0.1'].includes(url.hostname)) {
      response = new Response('Staging host only', {status: 421});
    } else if (url.pathname === '/robots.txt') {
      response = new Response('User-agent: *\nDisallow: /\n', {headers: {'Content-Type': 'text/plain'}});
    } else if (url.pathname === '/sitemap.xml') {
      response = new Response('Staging has no sitemap', {status: 404});
    } else if (url.pathname === '/go/play') {
      response = Response.redirect('https://play.google.com/store/apps/details?id=com.planora.labs', 302);
    } else if (url.pathname === '/go/features') {
      response = new Response(null, {status: 204});
    } else {
      response = await env.ASSETS.fetch(request);
    }
    const result = new Response(response.body, response);
    for (const [name, value] of Object.entries(headers)) result.headers.set(name, value);
    return result;
  },
};
