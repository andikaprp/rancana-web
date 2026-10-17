"""Build a deployment-only staging copy; production source is never rewritten."""
from pathlib import Path
import fnmatch
import hashlib
import json
import re
import shutil
import subprocess

root = Path(__file__).resolve().parent.parent
out = root / 'dist-staging'
if out.exists():
    shutil.rmtree(out)
out.mkdir()
patterns = [s.strip().rstrip('/') for s in (root / '.assetsignore').read_text().splitlines() if s.strip()]
allowed = {'.html', '.css', '.js', '.svg', '.png', '.webp', '.ico', '.woff', '.woff2', '.xml', '.txt', '.json'}
files = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
for name in files:
    src = root / name
    if not name or src.suffix not in allowed or name.startswith(('staging/', 'dist-staging/')):
        continue
    if any(fnmatch.fnmatchcase(name, p) or name.startswith(p + '/') for p in patterns):
        continue
    if name in {'sitemap.xml', 'robots.txt'}:
        continue
    dest = out / name
    dest.parent.mkdir(parents=True, exist_ok=True)
    if src.suffix == '.html':
        html = src.read_text()
        html = re.sub(r'<meta\b[^>]*name=[\"\x27]robots[\"\x27][^>]*>', '', html, flags=re.I)
        html = re.sub(r'<head\b[^>]*>', lambda m: m[0] + '<meta name="robots" content="noindex,nofollow,noarchive"><link rel="stylesheet" href="/staging-preview.css">', html, count=1, flags=re.I)
        html = re.sub(r'<body\b[^>]*>', lambda m: m[0] + '<aside class="staging-notice" aria-label="Testing environment">STAGING · Testing only · Analytics off</aside>', html, count=1, flags=re.I)
        # Remove externally loaded executable scripts, retaining local application UI.
        html = re.sub(r'<script\b[^>]*src=[\"\x27](?:https?:)?//[^>]*>.*?</script>', '', html, flags=re.I | re.S)
        dest.write_text(html)
    else:
        shutil.copyfile(src, dest)
# Defense in depth: never ship the production measurement ID or analytics/replay loader.
(out / 'analytics-config.js').write_text('window.RancanaAnalyticsConfig = Object.freeze({measurementId: ""});\n')
(out / 'analytics-consent.js').write_text('// Staging only: analytics, campaign persistence and Play referrer handoff disabled.\n')
(out / 'robots.txt').write_text('User-agent: *\nDisallow: /\n')
(out / 'staging-preview.css').write_text('.staging-notice{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);z-index:2147483647;box-sizing:border-box;max-width:calc(100% - 16px);padding:7px 12px;border:1px solid #3b5b42;border-radius:8px;background:#f0f7ee;color:#183820;font:600 12px/1.4 system-ui;text-align:center;pointer-events:none}body{padding-bottom:48px}\n')
(out / '_headers').write_text('/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n  Cache-Control: no-store\n  Referrer-Policy: no-referrer\n')
manifest = {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}
evidence = root / 'review-evidence/staging'
evidence.mkdir(parents=True, exist_ok=True)
(evidence / 'manifest.json').write_text(json.dumps({'commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(), 'files': manifest}, indent=2) + '\n')
print(f'Staging build: {len(manifest)} files in {out}')
