from pathlib import Path
import json,copy,base64,html,hashlib,math
root=Path(__file__).resolve().parent
source=root.parent/'cana-white-lower-lashes'
baseline=json.loads((source/'editable-layers.json').read_text())
options=[
 {'id':'A','title':'Soft curves','description':'3 short rounded strokes per eye','kind':'rounded','positions':[.15,.5,.85],'lengths':[4,4.4,3.9],'fans':[-.65,0,.65],'width':.95},
 {'id':'B','title':'Graduated fan','description':'4 curved graduated strokes per eye','kind':'tapered','positions':[.1,.35,.65,.9],'lengths':[6.2,5.3,4.6,3.9],'fans':[-2,-1.65,-1.1,-.7],'width':1.05,'tip':.25},
 {'id':'C','title':'Fine wisps','description':'5 fine tapered wisps per eye','kind':'tapered','positions':[.1,.3,.5,.7,.9],'lengths':[4.7,5.4,5.8,5.2,4.4],'fans':[-1,-.6,0,.6,1],'width':.75,'tip':.15},
]
def walk(n):
 if isinstance(n,str):return
 yield n
 for child in n['children']:
  if isinstance(child,dict):yield from walk(child)
def without_lashes(tree):
 tree=copy.deepcopy(tree)
 for n in walk(tree):n['children']=[c for c in n['children'] if not isinstance(c,dict) or not c['attributes'].get('data-lashes')]
 return tree
bodydata={};(root/'assets').mkdir(exist_ok=True)
for key in ['ranca','cana']:
 data=(source/'assets'/(key+'-body.webp')).read_bytes();(root/'assets'/(key+'-body.webp')).write_bytes(data);bodydata[key]='data:image/webp;base64,'+base64.b64encode(data).decode()
def fmt(p):return ' '.join(f'{v:.5f}' for v in p)
def ribbon(center,width,tip):
 def normal(a,b):
  dx,dy=b[0]-a[0],b[1]-a[1];length=math.hypot(dx,dy);return[-dy/length,dx/length]
 def offset(p,n,w):return[p[0]+n[0]*w,p[1]+n[1]*w]
 normals=[normal(center[0],center[1]),normal(center[0],center[2]),normal(center[1],center[2])]
 a,b,c=[offset(p,n,w) for p,n,w in zip(center,normals,[width/2,width*.37,tip/2])]
 g,f,e=[offset(p,n,-w) for p,n,w in zip(center,normals,[width/2,width*.37,tip/2])]
 dx,dy=center[2][0]-center[1][0],center[2][1]-center[1][1];length=math.hypot(dx,dy)
 cap=[center[2][0]+dx/length*tip*.65,center[2][1]+dy/length*tip*.65]
 return f'M {fmt(a)} Q {fmt(b)} {fmt(c)} Q {fmt(cap)} {fmt(e)} Q {fmt(f)} {fmt(g)} Z'
def xml(n,prefix=''):
 if isinstance(n,str):return html.escape(n)
 attrs=n['attributes'].copy()
 if 'id' in attrs:attrs['id']=prefix+attrs['id']
 if n['tag']=='image':attrs['href']=bodydata[attrs['data-body-art']]
 return '<'+n['tag']+''.join(' '+k+'="'+html.escape(str(v),quote=True)+'"' for k,v in attrs.items())+'>'+''.join(xml(c,prefix) for c in n['children'])+'</'+n['tag']+'>'
def framed(tree,box,only_cana=False):
 t=copy.deepcopy(tree);t['attributes']['viewBox']=box
 if only_cana:t['children']=[n for n in t['children'] if not isinstance(n,dict) or n['attributes'].get('data-character')!='ranca']
 t['children'].insert(0,{'tag':'rect','attributes':{'x':'0','y':'0','width':'1600','height':'715','fill':'#24493b'},'children':[]})
 return t
def page(svg,title):return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+'</title><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto}</style>'+svg+'</html>'
cards=[]
for option in options:
 folder=root/option['id'];folder.mkdir(exist_ok=True)
 tree=without_lashes(baseline)
 for side,start,width,base,curve in [('left',-7,19,-4.5,6),('right',-11,23,-5,4.4)]:
  eye=next(n for n in walk(tree) if n['attributes'].get('id')=='cana-'+side+'-eye-group')
  attrs={'id':'cana-'+side+'-lashes','data-lashes':side,'data-style':option['kind'],'fill':'none' if option['kind']=='rounded' else '#fff9fc','stroke':'#fff9fc' if option['kind']=='rounded' else 'none'}
  if option['kind']=='rounded':attrs.update({'stroke-width':str(option['width']),'stroke-linecap':'round','stroke-linejoin':'round'})
  lashes={'tag':'g','attributes':attrs,'children':[]}
  lengths=option['lengths'] if option['id']!='B' or side=='left' else list(reversed(option['lengths']))
  fans=option['fans'] if option['id']!='B' or side=='left' else [-v for v in reversed(option['fans'])]
  for i,(t,length,fan) in enumerate(zip(option['positions'],lengths,fans),1):
   x=start+width*t;y=base+curve*t*(1-t)
   center=[[x,y],[x-fan*.08,y+length*.66],[x+fan,y+length]]
   d=f'M {fmt(center[0])} Q {fmt(center[1])} {fmt(center[2])}' if option['kind']=='rounded' else ribbon(center,option['width'],option['tip'])
   lashes['children'].append({'tag':'path','attributes':{'id':f'cana-{side}-lash-{i}','data-lash':str(i),'d':d},'children':[]})
  eye['children'].append(lashes)
 assert without_lashes(tree)==without_lashes(baseline)
 (folder/'editable-layers.json').write_text(json.dumps(tree,indent=2)+'\n')
 pair=framed(tree,'0 0 1600 715');full=framed(tree,'830 130 740 580',True);face=framed(tree,'1030 295 285 160',True)
 (folder/'RancaCana.svg').write_text(xml(pair));(folder/'Cana.svg').write_text(xml(full))
 (folder/'pair.html').write_text(page(xml(pair),option['id']+' · '+option['title']))
 (folder/'Cana.html').write_text(page(xml(full),option['id']+' · '+option['title']))
 (folder/'face.html').write_text(page(xml(face),option['id']+' · face close-up'))
 cards.append('<article data-option="'+option['id']+'"><header><h2>'+option['id']+' · '+option['title']+'</h2><p>'+option['description']+'</p></header><div class="full">'+xml(full,option['id']+'-full-')+'</div><h3>FACE CLOSE-UP · SAME CROP</h3><div class="face">'+xml(face,option['id']+'-face-')+'</div></article>')
css='''*{box-sizing:border-box}html,body{margin:0;background:#f1f3eb;color:#203f33;font-family:system-ui,sans-serif}main{width:1476px;padding:24px}main>header h1{font-size:30px;margin:0 0 6px}main>header p{font-size:17px;margin:0;color:#536c5d}.grid{display:grid;grid-template-columns:repeat(3,462.5px);gap:20px;margin-top:22px}article{background:#24493b;color:#f1f7ee;border-radius:12px;overflow:hidden}article header{padding:19px 20px 15px}h2{font-size:25px;margin:0 0 6px}article p{font-size:16px;margin:0}svg{display:block;width:100%;height:auto}h3{font-size:13px;letter-spacing:.03em;margin:0;padding:13px 20px;background:#1c3b2f}footer{font-size:15px;color:#536c5d;margin-top:17px}'''
(root/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Cana · three white lash options</title><style>'+css+'</style><main><header><h1>Cana · three white lash options</h1><p>Same relaxed lids, expression and scale. Only the white lashes change.</p></header><section class="grid">'+''.join(cards)+'</section><footer>Full Cana shown at the same normal display scale in every option. No option is selected or applied to the website.</footer></main></html>')
(root/'manifest.json').write_text(json.dumps({'sourceCommit':'0cc81a1eafa24adce523866fa3082ccad851116b','status':'Exactly three unselected review-only alternatives','allArtworkOutsideLashesUnchanged':True,'rancaUnchanged':True,'canaBodyHeightRatio':.9,'normalDisplayScale':.625,'fullCanaViewBox':'830 130 740 580','faceViewBox':'1030 295 285 160','options':options,'bodyHashes':{k:hashlib.sha256((root/'assets'/(k+'-body.webp')).read_bytes()).hexdigest() for k in ['ranca','cana']}},indent=2)+'\n')
print('Built exactly A/B/C: 3 rounded, 4 graduated and 5 fine wispy lashes per lid. Non-lash artwork identical.')
