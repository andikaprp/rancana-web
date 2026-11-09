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
  // The exit survey lives at /berhenti (Indonesian only, no /id/ copy).
  ['/id/berhenti', '/berhenti'],
  ['/id/berhenti/', '/berhenti'],
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

// RAN-139 exit survey (/berhenti). Stores only the option id, the optional Lainnya
// text and a timestamp in the BERHENTI KV namespace. No IP, user agent or other
// request data is read or stored. The Lainnya text is untrusted and never rendered.
const BERHENTI_OPTIONS = new Set(['confused_start', 'setup_tedious', 'missing_feature', 'other_app', 'forgot', 'not_needed', 'other']);
const BERHENTI_HOSTS = new Set(['rancana.id', 'staging.rancana.id', ...LOCAL_HOSTS]);
const BERHENTI_MAX_BODY = 2048;
const BERHENTI_MAX_OTHER = 280;
const berhentiReply = (status, body, headers = {}) => new Response(JSON.stringify(body), {status, headers: {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex',
  ...headers,
}});
// Reads at most BERHENTI_MAX_BODY bytes; returns null when the body is larger.
const readCappedBody = async request => {
  if (Number(request.headers.get('Content-Length') || 0) > BERHENTI_MAX_BODY) return null;
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BERHENTI_MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
};
const handleBerhenti = async (request, env, url) => {
  if (request.method !== 'POST') return berhentiReply(405, {error: 'method'}, {Allow: 'POST'});
  // Same-origin only: the page and the API share one host.
  const origin = request.headers.get('Origin');
  if (origin !== url.origin || !BERHENTI_HOSTS.has(url.hostname.toLowerCase())) return berhentiReply(403, {error: 'origin'});
  if (!/^application\/json\b/i.test(request.headers.get('Content-Type') || '')) return berhentiReply(415, {error: 'type'});
  let text;
  try { text = await readCappedBody(request); } catch { return berhentiReply(400, {error: 'body'}); }
  if (text === null) return berhentiReply(413, {error: 'size'});
  let data;
  try { data = JSON.parse(text); } catch { return berhentiReply(400, {error: 'json'}); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return berhentiReply(400, {error: 'json'});
  if (Object.keys(data).some(key => key !== 'option' && key !== 'other')) return berhentiReply(400, {error: 'fields'});
  const {option, other = null} = data;
  if (typeof option !== 'string' || !BERHENTI_OPTIONS.has(option)) return berhentiReply(400, {error: 'option'});
  if (other !== null && typeof other !== 'string') return berhentiReply(400, {error: 'other'});
  const trimmed = (other ?? '').trim();
  if (trimmed.length > BERHENTI_MAX_OTHER) return berhentiReply(400, {error: 'other'});
  if (trimmed && option !== 'other') return berhentiReply(400, {error: 'other'});
  if (!env.BERHENTI) return berhentiReply(503, {error: 'storage'});
  const ts = new Date().toISOString();
  const key = `berhenti:${ts}:${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`;
  try {
    await env.BERHENTI.put(key, JSON.stringify({option, other: trimmed || null, ts}));
  } catch { return berhentiReply(503, {error: 'storage'}); }
  return berhentiReply(200, {ok: true});
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
    const goPath = url.pathname.startsWith('/go/');
    const moved = goPath ? null : canonicalOrigin(url);
    if (moved) return moved;
    if (url.pathname === '/go/play') {
      const destination = new URL(PLAY);
      destination.searchParams.set('referrer', playReferrer(url.searchParams).toString());
      return new Response(null, {status: 302, headers: {
        Location: destination.href,
        'Cache-Control': 'no-store',
      }});
    }
    if (url.pathname === '/go/features') return new Response(null, { status: 204 });
    if (url.pathname === '/api/berhenti') return handleBerhenti(request, env, url);
    const redirect = permanentRedirect(url);
    if (redirect) return redirect;
    return withCharset(await env.ASSETS.fetch(request));
  },
};
