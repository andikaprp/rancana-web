import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const release = process.env.RELEASE_SHA;
assert.match(release || '', /^[0-9a-f]{40}$/);
const before = '84bb9227655a6ca3e62402559858290d401711c2';
const origin = 'https://rancana.id';
const out = 'review-evidence/production-pr23';
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const committed = (ref, file) => execFileSync('git', ['show', `${ref}:${file}`], {maxBuffer: 20 * 1024 * 1024});
const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', release], {encoding: 'utf8'}).trim().split('\n');
const paths = tracked.filter(file => /^(?:(?:id|en)\/)?[^/]+\.html$/.test(file)
  || /^(?:[^/]+\.(?:css|js)|favicon\.ico)$/.test(file) && file !== 'worker.js'
  || /^assets\/mascots\/(?:ranca-cloud|cana-cloud|ranca-backpack-option-3)\.webp$/.test(file)
  || file === 'assets/mascots/ranca-header.svg'
  || /^assets\/mascots\/poses\/(?:ranca-body|cana-body)\.webp$/.test(file));
const report = {release, approvedHead: '05622416d4c355c7ff5d7bc7a2a6f46da7d4f1a3', origin,
  checkedAt: new Date().toISOString(), cloudflareBuild: process.env.CLOUDFLARE_BUILD,
  cloudflareVersion: process.env.CLOUDFLARE_VERSION, files: [], complete: false};
await fs.mkdir(out, {recursive: true});
assert.equal(execFileSync('git', ['diff', '--name-only', report.approvedHead, release], {encoding: 'utf8'}), '',
  'merge tree must exactly match the user-approved head');
for (const file of ['favicon.ico', 'companion-motion.js', 'companion-motion.css', 'companion-art.js', 'index.html', 'id/index.html', 'en/index.html', 'assets/mascots/poses/ranca-body.webp', 'assets/mascots/poses/cana-body.webp']) {
  assert.equal(sha256(committed(release, file)), sha256(committed(before, file)), `${file}: unrelated artwork remains unchanged`);
}
const pending = [...paths];
await Promise.all(Array.from({length: 4}, async () => {
  while (pending.length) {
    const file = pending.shift();
    const expected = committed(release, file);
    const item = {file, expectedSha256: sha256(expected), expectedBytes: expected.length};
    try {
      const response = await fetch(`${origin}/${file}`, {headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(25000)});
      const actual = Buffer.from(await response.arrayBuffer());
      Object.assign(item, {status: response.status, finalUrl: response.url, actualSha256: sha256(actual), actualBytes: actual.length,
        etag: response.headers.get('etag'), cfRay: response.headers.get('cf-ray'), match: response.ok && actual.equals(expected)});
      if (!item.match && /\.(html|js|css)$/.test(file)) await fs.writeFile(`${out}/${file.replaceAll('/', '-')}.served.txt`, actual);
    } catch (error) { item.error = error.message; item.match = false; }
    report.files.push(item);
  }
}));
report.files.sort((a, b) => a.file.localeCompare(b.file));
report.complete = report.files.length === paths.length && report.files.every(file => file.match);
await fs.writeFile(`${out}/served-bytes.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({release, checked: paths.length, matched: report.files.filter(file => file.match).length,
  mismatches: report.files.filter(file => !file.match)}, null, 2));
assert.equal(report.complete, true, 'all production documents and critical assets must match the approved merged release');
