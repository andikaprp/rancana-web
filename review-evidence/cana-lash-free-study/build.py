from pathlib import Path
import json,copy,base64,html,hashlib
root=Path(__file__).resolve().parent
source=root.parent/'no-brow-editable-bundle'
tree=json.loads((source/'editable-layers.json').read_text())
before=copy.deepcopy(tree)
def walk(n):
 if isinstance(n,str):return
 yield n
 for child in n['children']:
  if isinstance(child,dict):yield from walk(child)
chars={n['attributes']['data-character']:n for n in tree['children'] if isinstance(n,dict) and 'data-character' in n['attributes']}
for eye_id,transform,path in [('cana-left-eye-group','translate(72 167)','M -7 -4.5 Q 2.5 -1.5 12 -4.5'),('cana-right-eye-group','translate(117 166)','M -11 -5 Q 0.5 -2.8 12 -5')]:
 eye=next(n for n in walk(chars['cana']) if n['attributes'].get('id')==eye_id)
 eye['attributes']['transform']=transform
 eye['children']=[n for n in eye['children'] if not n['attributes'].get('data-lashes')]
 eye['children'][0]['attributes']['d']=path
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
(root/'preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ranca and Cana · relaxed lash-free study</title><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto;max-width:1600px;margin:auto}</style>'+svg+'</html>')
close=copy.deepcopy(pair);close['attributes']['viewBox']='1030 295 285 160'
(root/'Cana-closeup.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Cana · relaxed line eyes</title><style>html,body{margin:0;background:#24493b;color:#f1f7ee;font-family:system-ui,sans-serif}main{width:960px}h1{font-size:32px;margin:0;padding:24px 28px 8px}p{font-size:22px;margin:0;padding:0 28px 20px}svg{display:block;width:960px;height:auto}</style><main><h1>Cana · relaxed line eyes</h1><p>Soft curves, slight asymmetry · no lashes or eyebrows</p>'+xml(close)+'</main></html>')
canasvg={'tag':'svg','attributes':{'xmlns':'http://www.w3.org/2000/svg','viewBox':'0 0 745 528','role':'img','aria-label':'Cana relaxed lash-free study'},'children':chars['cana']['children']}
(root/'Cana.svg').write_text(xml(canasvg))
def without_cana_eyes(t):
 t=copy.deepcopy(t)
 for n in walk(t):
  if n['attributes'].get('id')=='cana-face':n['children']=[c for c in n['children'] if c['attributes'].get('id') not in ['cana-left-eye-group','cana-right-eye-group']]
 return t
assert without_cana_eyes(before)==without_cana_eyes(tree)
assert next(n for n in before['children'] if isinstance(n,dict) and n['attributes'].get('data-character')=='ranca')==chars['ranca']
assert not any(n['attributes'].get('data-lashes') for n in walk(tree))
(root/'manifest.json').write_text(json.dumps({'status':'Single controlled preview, not approved for integration','sourceFullPair':'c598c91f7c3a65e56ff5a327d8f544e1d0488339','sourceEyesRejected':True,'change':'Cana only: relaxed shallow near-horizontal line eyes, no lashes or eyebrows','allArtworkOutsideCanaEyesUnchanged':True,'rancaUnchanged':True,'canaBodyHeightRatio':.9,'ABCOptionApplied':False,'rasterBodies':{k:hashlib.sha256((root/'assets'/(k+'-body.webp')).read_bytes()).hexdigest() for k in ['ranca','cana']}},indent=2)+'\n')
print('Built one isolated lash-free full-pair study; Ranca and all non-eye artwork unchanged.')
