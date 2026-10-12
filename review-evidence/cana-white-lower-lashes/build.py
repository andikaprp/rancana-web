from pathlib import Path
import json,copy,base64,html,hashlib,math
root=Path(__file__).resolve().parent
source=root.parent/'cana-lash-free-study'
tree=json.loads((source/'editable-layers.json').read_text())
before=copy.deepcopy(tree)
def walk(n):
 if isinstance(n,str):return
 yield n
 for child in n['children']:
  if isinstance(child,dict):yield from walk(child)
chars={n['attributes']['data-character']:n for n in tree['children'] if isinstance(n,dict) and 'data-character' in n['attributes']}
lengths=[4.6,5.3,5.9,5.8,5.2,4.4]
positions=[.08,.24,.40,.60,.76,.92]
fans=[-1.65,-1.05,-.4,.4,1.05,1.65]
for side,start,width,base,curve in [('left',-7,19,-4.5,6),('right',-11,23,-5,4.4)]:
 eye=next(n for n in walk(chars['cana']) if n['attributes'].get('id')=='cana-'+side+'-eye-group')
 lashes={'tag':'g','attributes':{'id':'cana-'+side+'-lashes','data-lashes':side,'fill':'#fff9fc','stroke':'none'},'children':[]}
 for i,(t,length,fan) in enumerate(zip(positions,lengths,fans),1):
  x=start+width*t;y=base+curve*t*(1-t)
  center=[[x,y],[x-fan*.15,y+length*.65],[x+fan,y+length]]
  def normal(a,b):
   dx,dy=b[0]-a[0],b[1]-a[1];distance=math.hypot(dx,dy);return[-dy/distance,dx/distance]
  def offset(p,n,w):return[p[0]+n[0]*w,p[1]+n[1]*w]
  normals=[normal(center[0],center[1]),normal(center[0],center[2]),normal(center[1],center[2])]
  a,b,c=[offset(p,n,w) for p,n,w in zip(center,normals,[.525,.4,.12])]
  g,f,e=[offset(p,n,-w) for p,n,w in zip(center,normals,[.525,.4,.12])]
  dx,dy=center[2][0]-center[1][0],center[2][1]-center[1][1];distance=math.hypot(dx,dy)
  cap=[center[2][0]+dx/distance*.16,center[2][1]+dy/distance*.16]
  def fmt(p):return ' '.join(f'{v:.5f}' for v in p)
  d=f'M {fmt(a)} Q {fmt(b)} {fmt(c)} Q {fmt(cap)} {fmt(e)} Q {fmt(f)} {fmt(g)} Z'
  lashes['children'].append({'tag':'path','attributes':{'id':f'cana-{side}-lash-{i}','data-lash':str(i),'d':d},'children':[]})
 eye['children'].append(lashes)
(root/'assets').mkdir(exist_ok=True)
bodydata={}
for key in ['ranca','cana']:
 data=(source/'assets'/(key+'-body.webp')).read_bytes();(root/'assets'/(key+'-body.webp')).write_bytes(data)
 bodydata[key]='data:image/webp;base64,'+base64.b64encode(data).decode()
def xml(n):
 if isinstance(n,str):return html.escape(n)
 attrs=n['attributes'].copy()
 if n['tag']=='image':attrs['href']=bodydata[attrs['data-body-art']]
 return '<'+n['tag']+''.join(' '+k+'="'+html.escape(str(v),quote=True)+'"' for k,v in attrs.items())+'>'+''.join(xml(c) for c in n['children'])+'</'+n['tag']+'>'
(root/'editable-layers.json').write_text(json.dumps(tree,indent=2)+'\n')
pair=copy.deepcopy(tree);pair['children'].insert(0,{'tag':'rect','attributes':{'id':'background','width':'1600','height':'715','fill':'#24493b'},'children':[]})
svg=xml(pair)
(root/'RancaCana.svg').write_text(svg)
(root/'preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ranca and Cana · white lower-lash study</title><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto;max-width:1600px;margin:auto}</style>'+svg+'</html>')
close=copy.deepcopy(pair);close['attributes']['viewBox']='1030 295 285 160'
(root/'Cana-closeup.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Cana · neat white lower lashes</title><style>html,body{margin:0;background:#24493b;color:#f1f7ee;font-family:system-ui,sans-serif}main{width:960px}h1{font-size:32px;margin:0;padding:24px 28px 8px}p{font-size:22px;margin:0;padding:0 28px 20px}svg{display:block;width:960px;height:auto}</style><main><h1>Cana · neat white lower lashes</h1><p>Curved, softly tapered white lashes · existing eyes unchanged</p>'+xml(close)+'</main></html>')
canasvg={'tag':'svg','attributes':{'xmlns':'http://www.w3.org/2000/svg','viewBox':'0 0 745 528','role':'img','aria-label':'Cana white lower-lash study'},'children':chars['cana']['children']}
(root/'Cana.svg').write_text(xml(canasvg))
def without_lashes(t):
 t=copy.deepcopy(t)
 for n in walk(t):n['children']=[c for c in n['children'] if not isinstance(c,dict) or not c['attributes'].get('data-lashes')]
 return t
assert without_lashes(before)==without_lashes(tree)
assert next(n for n in before['children'] if isinstance(n,dict) and n['attributes'].get('data-character')=='ranca')==chars['ranca']
# Static same-frame comparison: unchanged baseline and candidate, no animation.
def background_pair(scene):
 out=copy.deepcopy(scene);out['children'].insert(0,{'tag':'rect','attributes':{'width':'1600','height':'715','fill':'#24493b'},'children':[]});return out
before_pair=background_pair(before)
rows=[]
for title,scene in [('0023cb6 · prior lash-free study',before_pair),('Proposed · white downward lashes',pair)]:
 face=copy.deepcopy(scene);face['attributes']['viewBox']='1030 295 285 160'
 rows.append('<article><h2>'+title+'</h2><div>'+xml(scene)+'</div><h3>Same-frame face detail</h3>'+xml(face)+'</article>')
(root/'contact-sheet.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Static same-frame lash comparison</title><style>*{box-sizing:border-box}html,body{margin:0;background:#eef1e9;color:#203f33;font-family:system-ui,sans-serif}main{width:1600px;padding:24px}header{font-size:25px;margin-bottom:16px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}article{background:#24493b;color:#f1f7ee}h2{font-size:22px;margin:0;padding:18px}h3{font-size:16px;margin:0;padding:14px 18px;background:#203f33}svg{width:100%;height:auto;display:block}</style><main><header>Same-frame review · only Cana’s lower lashes are added</header><section class="grid">'+''.join(rows)+'</section></main></html>')
(root/'manifest.json').write_text(json.dumps({'status':'Review-only preview; stop for user review','sourceFullPair':'0023cb6fe11ff9b5646782e0c63dbe8c5c02621b','change':'Add six neat thinner softly tapered white downward lashes per Cana lid; existing eye direction and all prior artwork unchanged','allPriorArtworkUnchanged':True,'rancaUnchanged':True,'canaBodyHeightRatio':.9,'referenceAccess':'Library resolved the attachment but supported byte transfer failed; followed parent visual inspection supplied in the task. No local visual-inspection claim.','lashBaseWidth':1.05,'lashTipWidth':.24,'lidStrokeWidth':3.7,'rasterBodies':{k:hashlib.sha256((root/'assets'/(k+'-body.webp')).read_bytes()).hexdigest() for k in ['ranca','cana']}},indent=2)+'\n')
print('Built white downward lashes only; all previous artwork exactly preserved.')
