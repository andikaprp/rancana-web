from pathlib import Path
import json,copy,base64,html,hashlib,math,re
root=Path(__file__).resolve().parent
source=root.parent/'cana-three-lash-options'
options=[('A','Soft curves','3 short rounded lashes per eye'),('B','Graduated fan','4 graduated lashes per eye'),('C','Fine wisps','5 finer tapered lashes per eye')]
bodydata={};(root/'assets').mkdir(exist_ok=True)
for key in ['ranca','cana']:
 data=(source/'assets'/(key+'-body.webp')).read_bytes();(root/'assets'/(key+'-body.webp')).write_bytes(data);bodydata[key]='data:image/webp;base64,'+base64.b64encode(data).decode()
def walk(n):
 if isinstance(n,str):return
 yield n
 for c in n['children']:
  if isinstance(c,dict):yield from walk(c)
def without_cana_eyes(t):
 t=copy.deepcopy(t)
 for n in walk(t):
  if n['attributes'].get('id')=='cana-face':n['children']=[c for c in n['children'] if c['attributes'].get('id') not in ['cana-left-eye-group','cana-right-eye-group']]
 return t
def xml(n,prefix=''):
 if isinstance(n,str):return html.escape(n)
 a=n['attributes'].copy()
 if 'id'in a:a['id']=prefix+a['id']
 if n['tag']=='image':a['href']=bodydata[a['data-body-art']]
 return '<'+n['tag']+''.join(' '+k+'="'+html.escape(str(v),quote=True)+'"' for k,v in a.items())+'>'+''.join(xml(c,prefix) for c in n['children'])+'</'+n['tag']+'>'
def framed(tree,box,cana_only=False):
 t=copy.deepcopy(tree);t['attributes']['viewBox']=box
 for n in walk(t):
  if n['tag']=='text':n['children']=['Cana' if c=='Cana · sassy' else c for c in n['children']]
 if cana_only:t['children']=[n for n in t['children'] if not isinstance(n,dict) or n['attributes'].get('data-character')!='ranca']
 t['children'].insert(0,{'tag':'rect','attributes':{'width':'1600','height':'715','fill':'#24493b'},'children':[]});return t
def page(svg,title):return '<!doctype html><html lang="en"><meta charset="utf-8"><title>'+title+'</title><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto}</style>'+svg+'</html>'
def number(v):return f'{v:.5f}'.rstrip('0').rstrip('.')
rows=[];face_rows=[]
for option,title,description in options:
 baseline=json.loads((source/option/'editable-layers.json').read_text())
 state_cards=[];face_cards=[]
 for state in ['closed','open']:
  tree=copy.deepcopy(baseline)
  if state=='open':
   for side,start,width,cx,cy,rx,ry in [('left',-7,19,2.5,-4,6.6,9),('right',-11,23,.5,-4,7,9.2)]:
    group=next(n for n in walk(tree) if n['attributes'].get('id')=='cana-'+side+'-eye-group')
    lid=next(n for n in group['children'] if n['attributes'].get('data-line-eye'))
    lashes=next(n for n in group['children'] if n['attributes'].get('data-lashes'))
    lid['attributes']['d']=f'M {number(cx-rx)} {number(cy)} A {number(rx)} {number(ry)} 0 0 1 {number(cx+rx)} {number(cy)}'
    lid['attributes']['stroke']='none' # Attachment guide only; the white oval supplies one smooth visible edge.
    eye={'tag':'ellipse','attributes':{'id':'cana-'+side+'-open-eye','data-open-eye':side,'cx':number(cx),'cy':number(cy),'rx':number(rx),'ry':number(ry),'fill':'#fff9fc','stroke':'none'},'children':[]}
    group['children'].insert(0,eye)
    for lash in lashes['children']:
     nums=[float(x) for x in re.findall(r'-?\d*\.?\d+',lash['attributes']['d'])]
     if lashes['attributes'].get('data-style')=='rounded':x,y=nums[:2]
     else:x,y=(nums[0]+nums[12])/2,(nums[1]+nums[13])/2
     t=(x-start)/width;angle=-150+120*t;theta=math.radians(angle)
     root_x=cx+rx*math.cos(theta);root_y=cy+ry*math.sin(theta)
     # Preserve each lash's native curve/weight, redistributing its root along the fully open upper edge.
     lash['attributes']['transform']=f'translate({number(root_x)} {number(root_y)}) rotate({number((angle+90)*.35)}) scale(1 -1) translate({number(-x)} {number(-y)})'
  assert without_cana_eyes(tree)==without_cana_eyes(baseline)
  if state=='closed':assert tree==baseline
  folder=root/option/state;folder.mkdir(parents=True,exist_ok=True)
  (folder/'editable-layers.json').write_text(json.dumps(tree,indent=2)+'\n')
  pair=framed(tree,'0 0 1600 715');full=framed(tree,'830 130 740 580',True);face=framed(tree,'1030 275 285 180',True)
  (folder/'RancaCana.svg').write_text(xml(pair));(folder/'Cana.svg').write_text(xml(full))
  for name,svg in [('pair',pair),('Cana',full),('face',face)]:
   (folder/(name+'.html')).write_text(page(xml(svg),option+' · '+state))
  label='Closed · baseline' if state=='closed' else 'Open · naturally alert'
  prefix=option+'-'+state+'-'
  state_cards.append('<article data-state="'+state+'"><h3>'+label+'</h3><div class="normal">'+xml(full,prefix+'normal-')+'</div><h4>FACE CLOSE-UP · SAME CROP</h4><div class="face">'+xml(face,prefix+'face-')+'</div></article>')
  face_cards.append('<article><h3>'+label+'</h3>'+xml(face,prefix+'sheet-')+'</article>')
 rows.append('<section data-option="'+option+'"><h2>'+option+' · '+title+' <span>'+description+'</span></h2><div class="states">'+''.join(state_cards)+'</div></section>')
 face_rows.append('<section data-option="'+option+'"><h2>'+option+' · '+title+'</h2><div class="states">'+''.join(face_cards)+'</div></section>')
css='''*{box-sizing:border-box}html,body{margin:0;background:#f1f3eb;color:#203f33;font-family:system-ui,sans-serif}main{width:1000px;padding:26px}h1{font-size:29px;margin:0 0 8px}.intro{font-size:16px;line-height:1.4;margin:0 0 22px;color:#536c5d}section{margin-bottom:26px}h2{font-size:24px;margin:0 0 12px}h2 span{font-size:16px;font-weight:400;margin-left:12px}.states{display:grid;grid-template-columns:462.5px 462.5px;gap:22px}article{background:#24493b;color:#f1f7ee;border-radius:10px;overflow:hidden}h3{font-size:19px;margin:0;padding:15px 18px}h4{font-size:12px;letter-spacing:.025em;background:#1c3b2f;margin:0;padding:12px 18px}svg{display:block;width:100%;height:auto}footer{font-size:14px;color:#536c5d}'''
header='<header><h1>Cana · open and closed eye states</h1><p class="intro">A/B/C lash options, closed and comfortably open.<br>Static state studies only. No option is selected.</p></header>'
(root/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Cana A/B/C · open and closed</title><style>'+css+'</style><main>'+header+''.join(rows)+'<footer>Lashes follow the curved upper eye edge. No brows, pupils, body changes or animation.</footer></main></html>')
(root/'face-contact-sheet.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><title>Cana A/B/C · face state contact sheet</title><style>'+css+'</style><main>'+header+''.join(face_rows)+'</main></html>')
(root/'manifest.json').write_text(json.dumps({'sourceCommit':'ddb7c008bb81d5e3e4f44256cf63240c8802efb9','status':'Three unselected lash options, each with closed and comfortably fully open state','previousHalfLiddedStudyCommit':'2f8ce89402d4b7a4d147813138faa16262b6066a','canonicalReferencesVisuallyInspected':['assets/mascots/ranca-backpack-option-3.webp','assets/mascots/cana-academic-cap-option-3.webp'],'openEyeTreatment':'Comfortably fully open solid white upright ovals, guided by the Pelajar open graphic eyes; lashes follow the curved upper edge; no flat lid, pupils, iris, highlights or brows','states':['closed','open'],'closedStatesExactBaseline':True,'allArtworkOutsideCanaEyesUnchanged':True,'lashTreatmentsPreserved':True,'openEyeDimensions':{'left':{'width':13.2,'height':18},'right':{'width':14,'height':18.4}},'normalDisplayScale':.625,'canaBodyHeightRatio':.9,'bodyHashes':{k:hashlib.sha256((root/'assets'/(k+'-body.webp')).read_bytes()).hexdigest() for k in ['ranca','cana']}},indent=2)+'\n')
print('Built 6 static states: exact A/B/C closed baselines and naturally fully open states.')
