"""Build a local, playable index inside the CI review artifact. No deployment."""
from pathlib import Path
import sys
kind=sys.argv[1]
folder=Path('review-evidence')/('companion-motion' if kind=='companion' else 'gesture-review')
videos=sorted(folder.glob('*.webm'))
if kind=='companion':
 images=sorted(folder.glob('*story*detail.png'))
else:
 images=[p for p in sorted(folder.glob('*.png')) if 'sunglasses-' in p.name and '-reduced' not in p.name]
html=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rancana gesture review</title><style>body{margin:32px auto;padding:0 20px;max-width:1400px;font:16px/1.5 system-ui;background:#f6f5f1;color:#254434}h1{font:36px Georgia}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}figure{margin:0;background:white;border-radius:16px;padding:12px}video,img{display:block;width:100%;height:auto;max-height:650px;object-fit:contain}figcaption{padding:8px;overflow-wrap:anywhere}</style><h1>Rancana · '+('Hero and footer' if kind=='companion' else 'Sunglasses Cana')+'</h1><p>Isolated review. Play the natural-speed desktop and mobile sequences, then compare pose checkpoints. No production deployment.</p><section>']
for v in videos: html.append(f'<figure><video controls playsinline preload="metadata" src="{v.name}"></video><figcaption>{v.stem}</figcaption></figure>')
html.append('</section><h2>Pose checkpoints</h2><section>')
for p in images: html.append(f'<figure><img src="{p.name}" loading="lazy"><figcaption>{p.stem}</figcaption></figure>')
html.append('</section></html>')
(folder/'index.html').write_text('\n'.join(html))
