from pathlib import Path
import math,json
root=Path(__file__).resolve().parent
scale=3.2*(.9*500/496)*.625
options=[
 {'id':'A','label':'Two soft curls','depths':[1.3,1.5],'roots':[-7,1.5],'sweep':4.4,'rise':4.8},
 {'id':'B','label':'One quiet sweep','depths':[.75,1.0],'roots':[-5],'sweep':6.5,'rise':5.2},
 {'id':'C','label':'Low flowing wisps','depths':[1.6,1.3],'roots':[-7,2],'sweep':5.2,'rise':4.4},
]
def fmt(p):return ' '.join(f'{v:.5f}'.rstrip('0').rstrip('.') for v in p)
def ribbon(ps):
 p0,p1,p2,p3=ps
 def normal(a,b):
  dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);return[-dy/length,dx/length]
 def shift(p,n,w):return[p[0]+n[0]*w,p[1]+n[1]*w]
 n0,n1,n2=normal(p0,p1),normal(p0,p2),normal(p1,p3)
 a,b,c=shift(p0,n0,.75),shift(p1,n1,.55),shift(p2,n2,.2)
 e,f,g=shift(p2,n2,-.2),shift(p1,n1,-.55),shift(p0,n0,-.75)
 return f'M {fmt(a)} C {fmt(b)} {fmt(c)} {fmt(p3)} C {fmt(e)} {fmt(f)} {fmt(g)} Z'
def svg(option,suffix='source'):
 groups=[]
 for i,depth in enumerate(option['depths']):
  side='left' if i==0 else 'right';paths=[]
  for x in option['roots']:
   y=depth*(1-(x/10)**2);sweep=option['sweep'];rise=option['rise']
   points=[[x,y],[x-sweep*.38,y-.35],[x-sweep*.93,y-rise*.4],[x-sweep,y-rise]]
   if i==1:points=[[-p[0],p[1]] for p in points]
   paths.append(ribbon(points))
  groups.append(f'<g id="{option["id"]}-{suffix}-{side}" data-eye="{side}" transform="translate({45*i} 0)"><path data-lid="{side}" d="M -10 0 Q 0 {depth*2} 10 0" fill="none" stroke="#fff9fc" stroke-width="3.7" stroke-linecap="round"/><path data-lashes="{side}" d="{" ".join(paths)}" fill="#fff9fc" stroke="none"/></g>')
 return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-18 -13 81 29" role="img" aria-label="Option '+option['id']+' eye-only sketch"><rect x="-18" y="-13" width="81" height="29" fill="#ff4084"/>'+''.join(groups)+'</svg>'
for o in options:(root/(o['id']+'.svg')).write_text(svg(o))
css='''*{box-sizing:border-box}html,body{margin:0;background:#f5f5ee;color:#203f33;font-family:system-ui,sans-serif}main{width:1200px;padding:28px}header h1{font-size:28px;margin:0 0 5px}header p{font-size:16px;margin:0;color:#54685b}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px}article{background:white;border:1px solid #d6ddd3;border-radius:12px;overflow:hidden}h2{font-size:24px;margin:16px 18px 2px}article>p{font-size:16px;margin:0 18px 16px}.label{font-size:13px;letter-spacing:.02em;padding:12px 18px 8px;color:#54685b}.swatch{background:#ff4084;display:flex;align-items:center;justify-content:center}.actual{height:102px}.actual svg{width:146.975806px;height:auto}.close{height:170px}.close svg{width:330px;height:auto}footer{font-size:14px;margin-top:18px;color:#54685b}'''
cards=''.join('<article data-option="'+o['id']+'"><h2>'+o['id']+'</h2><p>'+o['label']+'</p><div class="label">ACTUAL SIZE</div><div class="swatch actual">'+svg(o,'actual')+'</div><div class="label">ENLARGED · 2.25×</div><div class="swatch close">'+svg(o,'close')+'</div></article>' for o in options)
(root/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cana · eye-only sketches A/B/C</title><style>'+css+'</style><main><header><h1>Cana · eye-only sketches</h1><p>Shallow curves on a level baseline · slight asymmetry · no eyebrows</p></header><section class="grid">'+cards+'</section><footer>Actual size matches the eyes in a 1000px-wide pair preview. None of these sketches is applied to Cana.</footer></main></html>')
(root/'manifest.json').write_text(json.dumps({'status':'Unselected eye-only sketches','rejectedFullPair':'c598c91f7c3a65e56ff5a327d8f544e1d0488339','scope':'Eyes only; no body, hands, mouth, scale or full-pair rendering changes','actualSizeScale':scale,'referenceInspection':'Direct reference image download returned HTTP 403 in the previous task; actual image has not been visually inspected. These are description-guided alternatives, not a claimed match.','options':options},indent=2)+'\n')
print('Generated eye-only A/B/C SVGs and a self-contained comparison strip.')
