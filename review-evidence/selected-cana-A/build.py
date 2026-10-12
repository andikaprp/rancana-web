from pathlib import Path
import base64,copy,hashlib,html,json
root=Path(__file__).resolve().parent
review=root.parent
states=[('default-open','Normal open · default',review/'cana-normal-open-closed-options/A/open'),('closed','Closed counterpart',review/'cana-normal-open-closed-options/A/closed'),('contextual-sassy','Half-lidded · contextual sass',review/'cana-open-closed-options/A/open')]
(root/'assets').mkdir(exist_ok=True)
body_data={}
for character in ['ranca','cana']:
 data=(review/'cana-normal-open-closed-options/assets'/f'{character}-body.webp').read_bytes()
 (root/'assets'/f'{character}-body.webp').write_bytes(data)
 body_data[character]='data:image/webp;base64,'+base64.b64encode(data).decode()
def walk(n):
 if isinstance(n,str):return
 yield n
 for c in n['children']:
  if isinstance(c,dict):yield from walk(c)
def xml(n,prefix=''):
 if isinstance(n,str):return html.escape(n)
 a=n['attributes'].copy()
 if 'id' in a:a['id']=prefix+a['id']
 if n['tag']=='image':a['href']=body_data[a['data-body-art']]
 return '<'+n['tag']+''.join(' '+k+'="'+html.escape(str(v),quote=True)+'"' for k,v in a.items())+'>'+''.join(xml(c,prefix) for c in n['children'])+'</'+n['tag']+'>'
def frame(tree,box,character=None):
 t=copy.deepcopy(tree);t['attributes']['viewBox']=box
 if character:t['children']=[n for n in t['children'] if n['attributes'].get('data-character')==character]
 return t
def source_json(tree,asset_prefix):
 t=copy.deepcopy(tree)
 for n in walk(t):
  if n['tag']=='image':n['attributes']['href']=asset_prefix+n['attributes']['data-body-art']+'-body.webp'
 return json.dumps(t,indent=2)+'\n'
def page(svg,title):
 return '<!doctype html><html lang="en"><meta charset="utf-8"><title>'+title+'</title><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto}</style>'+svg+'</html>'
cards=[]
for state,label,source in states:
 baseline=json.loads((source/'editable-layers.json').read_text())
 t=copy.deepcopy(baseline)
 # Remove presentation captions only; every character subtree is preserved exactly.
 t['children']=[n for n in t['children'] if isinstance(n,dict) and n['attributes'].get('data-character')]
 assert t['children']==[n for n in baseline['children'] if isinstance(n,dict) and n['attributes'].get('data-character')]
 t['attributes']['aria-label']='Ranca and Cana; selected option A; '+label
 folder=root/state;folder.mkdir(exist_ok=True)
 (folder/'editable-layers.json').write_text(source_json(t,'../assets/'))
 views={'RancaCana':t,'Cana':frame(t,'830 130 740 580','cana'),'Ranca':frame(t,'0 75 800 580','ranca'),'face':frame(t,'1030 275 285 180','cana')}
 for name,tree in views.items():
  (folder/(name+'.svg')).write_text(xml(tree))
  (folder/(name+'.html')).write_text(page(xml(tree),label))
 if state=='default-open':
  default=t
  for name in ['RancaCana','Ranca','Cana']:(root/(name+'.svg')).write_text(xml(views[name]))
  (root/'editable-layers.json').write_text(source_json(t,'assets/'))
 cards.append('<article data-state="'+state+'"><h3>'+label+'</h3><div class="character">'+xml(views['Cana'],state+'-full-')+'</div><h4>MATCHING FACE DETAIL</h4><div class="face">'+xml(views['face'],state+'-face-')+'</div></article>')
css='''*{box-sizing:border-box}html,body{margin:0;background:#f1f3eb;color:#203f33;font-family:system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:30px}h1{font-size:30px;margin:4px 0 10px}.badge{font-size:13px;font-weight:700;letter-spacing:.1em}p{font-size:16px;line-height:1.5;margin:0 0 22px;color:#536c5d}.hero{background:#24493b;border-radius:12px;overflow:hidden}svg{display:block;width:100%;height:auto}h2{font-size:23px;margin:26px 0 12px}.states{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}article{background:#24493b;color:#f1f7ee;border-radius:10px;overflow:hidden}h3{font-size:16px;min-height:65px;margin:0;padding:16px}h4{font-size:11px;letter-spacing:.025em;background:#1c3b2f;margin:0;padding:10px 16px}footer{font-size:13px;color:#536c5d;margin-top:18px}@media(max-width:650px){main{padding:18px}.states{grid-template-columns:1fr}h3{min-height:0}}'''
header='<header><div class="badge">SELECTED DESIGN · OPTION A</div><h1>Ranca &amp; Cana</h1><p>Cana’s three soft white lashes, with normal open eyes as the default.<br>Closed and half-lidded counterparts are included below.</p></header>'
(root/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Selected A · Ranca and Cana</title><style>'+css+'</style><main>'+header+'<div class="hero">'+xml(default,'hero-')+'</div><section id="selected-states"><h2>Cana · selected expression set</h2><div class="states">'+''.join(cards)+'</div></section><footer>Design selection only. No website integration or animation.</footer></main></html>')
(root/'manifest.json').write_text(json.dumps({'status':'selected-design','selectedOption':'A','userSelection':'let’s do the A option','selectedAt':'2026-10-12T16:47:00Z','selectedSourceCommit':'8890fa0336851bc4ce082a946cbcbf3f5b8ebdb5','halfLiddedSourceCommit':'2f8ce89402d4b7a4d147813138faa16262b6066a','defaultState':'default-open','states':[{'id':s,'label':l,'sourcePath':str(p.relative_to(review.parent))}for s,l,p in states],'lashesPerEye':3,'characterGeometryPreserved':True,'presentationCaptionsRemoved':True,'background':'transparent in SVG/asset PNG; green in preview','canaBodyHeightRatio':.9,'bodyHashes':{k:hashlib.sha256((root/'assets'/f'{k}-body.webp').read_bytes()).hexdigest()for k in ['ranca','cana']}},indent=2)+'\n')
print('Packaged selected A: exact normal-open, closed and contextual half-lidded character artwork.')
