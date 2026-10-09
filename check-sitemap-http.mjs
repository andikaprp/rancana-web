// Diagnostic only: ordinary public GETs; no crawler impersonation or policy edits.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const urls = ['https://rancana.id/sitemap.xml', 'https://rancana.id/robots.txt', 'https://9d6e8f00-rancana.dikaprp.workers.dev/sitemap.xml'];
const fields = ['content-type', 'content-length', 'content-encoding', 'location', 'cache-control', 'age', 'etag', 'last-modified', 'server', 'cf-cache-status', 'cf-ray', 'cf-mitigated', 'vary', 'x-robots-tag'];
const results = [];
for (const requestedUrl of urls) {
  const result = {requestedUrl, redirects: [], collectedAt: new Date().toISOString()};
  try {
    let url = requestedUrl, response;
    for (let hop = 0; hop < 5; hop++) {
      response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(15000), headers: {'User-Agent': 'Rancana-Sitemap-ReadOnly-Diagnostic/1.0'}});
      const headers = Object.fromEntries(fields.map(key => [key, response.headers.get(key)]).filter(([, value]) => value !== null));
      result.redirects.push({url, status: response.status, headers});
      if (![301, 302, 303, 307, 308].includes(response.status) || !headers.location) break;
      url = new URL(headers.location, url).href;
    }
    const body = await response.text();
    result.finalUrl = url; result.status = response.status;
    result.bodySha256 = crypto.createHash('sha256').update(body).digest('hex');
    result.bodyBytes = Buffer.byteLength(body);
    result.looksLikeHtml = /^\s*(?:<!doctype html|<html)/i.test(body);
    result.urls = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    result.xmlNamespacePresent = body.includes('http://www.sitemaps.org/schemas/sitemap/0.9');
    if (requestedUrl.endsWith('/robots.txt')) result.robotsText = body;
  } catch (error) { result.error = String(error); }
  results.push(result);
}
await fs.mkdir('review-evidence', {recursive: true});
await fs.writeFile('review-evidence/sitemap-http-report.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
