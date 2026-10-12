from pathlib import Path
import json,base64,copy,html,hashlib
root=Path(__file__).resolve().parent.parent/'no-brow-editable-bundle'
tree=json.loads((root/'editable-layers.json').read_text())
bodydata={k:'data:image/webp;base64,'+base64.b64encode((root/'assets'/(k+'-body.webp')).read_bytes()).decode() for k in ['ranca','cana']}
def walk(n):
 if isinstance(n,str): return
 yield n
 for child in n['children']:
  if isinstance(child,dict): yield from walk(child)
for n in walk(tree):
 if n['tag']=='image': n['attributes']['href']='assets/'+n['attributes']['data-body-art']+'-body.webp'
(root/'editable-layers.json').write_text(json.dumps(tree,indent=2)+'\n')
characters={n['attributes']['data-character']:n for n in tree['children'] if isinstance(n,dict) and n['attributes'].get('data-character')}
def xml(n,embedded=True):
 if isinstance(n,str): return html.escape(n)
 attrs=n['attributes'].copy()
 if embedded and n['tag']=='image': attrs['href']=bodydata[attrs['data-body-art']]
 attr=''.join(' '+k+'="'+html.escape(str(v),quote=True)+'"' for k,v in attrs.items())
 return '<'+n['tag']+attr+'>'+''.join(xml(c,embedded) for c in n['children'])+'</'+n['tag']+'>'
background={'tag':'rect','attributes':{'id':'review-background','width':'1600','height':'715','fill':'#24493b'},'children':[]}
pair=copy.deepcopy(tree);pair['children'].insert(0,background)
(root/'RancaCana.svg').write_text(xml(pair))
for k,c in characters.items():
 single={'tag':'svg','attributes':{'xmlns':'http://www.w3.org/2000/svg','viewBox':'0 0 '+('741 532' if k=='ranca' else '745 528'),'role':'img','aria-label':k.capitalize()},'children':c['children']}
 (root/(k.capitalize()+'.svg')).write_text(xml(single))
(root/'preview.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ranca and Cana · no eyebrows</title><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto;max-width:1600px;margin:auto}</style>'+xml(pair)+'</html>')
camel={'stroke-width':'strokeWidth','stroke-linecap':'strokeLinecap','stroke-linejoin':'strokeLinejoin','font-family':'fontFamily','font-size':'fontSize','text-anchor':'textAnchor','class':'className'}
def jsx(n,indent=0):
 if isinstance(n,str): return html.escape(n)
 attrs=n['attributes'].copy();bits=[]
 for k,v in attrs.items():
  if n['tag']=='image' and k=='href': bits.append('href={bodySrc}');continue
  bits.append(camel.get(k,k)+'="'+html.escape(str(v),quote=True)+'"')
 prefix='  '*indent;opening='<'+n['tag']+(' '+' '.join(bits) if bits else '')
 if not n['children']: return prefix+opening+' />'
 if all(isinstance(c,str) for c in n['children']): return prefix+opening+'>'+''.join(html.escape(c) for c in n['children'])+'</'+n['tag']+'>'
 return prefix+opening+'>\n'+'\n'.join(jsx(c,indent+1) for c in n['children'])+'\n'+prefix+'</'+n['tag']+'>'
code='import React from "react";\n\n// Editable SVG geometry. Only the body textures are raster images.\nconst DEFAULT_RANCA_BODY = "assets/ranca-body.webp";\nconst DEFAULT_CANA_BODY = "assets/cana-body.webp";\n\n'
for key,c in characters.items():
 artwork={'tag':'g','attributes':{'id':key+'-artwork'},'children':c['children']}
 code+='export function '+key.capitalize()+'Artwork({ bodySrc = DEFAULT_'+key.upper()+'_BODY } = {}) {\n  return (\n'+jsx(artwork,2)+'\n  );\n}\n\n'
code+='export default function RancaCana({ rancaBodySrc = DEFAULT_RANCA_BODY, canaBodySrc = DEFAULT_CANA_BODY, background = "#24493b" } = {}) {\n  return (\n    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 715" role="img" aria-label="Ranca and Cana without eyebrows" style={{ display: "block", width: "100%", height: "auto" }}>\n      <rect id="review-background" width="1600" height="715" fill={background} />\n'
for key,c in characters.items():
 a=c['attributes']
 code+='      <g id="'+key+'-placement" data-character="'+key+'" data-body-scale="'+a['data-body-scale']+'" transform="'+a['transform']+'">\n        <'+key.capitalize()+'Artwork bodySrc={'+key+'BodySrc} />\n      </g>\n'
for n in tree['children']:
 if isinstance(n,dict) and n['tag']=='text':code+=jsx(n,3)+'\n'
code+='    </svg>\n  );\n}\n'
(root/'RancaCana.jsx').write_text(code)
embedded=code.replace('"assets/ranca-body.webp"',json.dumps(bodydata['ranca'])).replace('"assets/cana-body.webp"',json.dumps(bodydata['cana']))
(root/'RancaCana.embedded.jsx').write_text(embedded)
manifest={'basedOn':'a4bde1cb7d2f7e3f9abffea6a1241fda7ee15939','change':'Lengthen Ranca eye lines by 25%; mirror active palms to connect outside/open inside; halve Cana lash size and stroke weight','canaBodyHeightRatio':.9,'editableVectors':{},'rasterBodies':{},'entrypoints':{'react':'RancaCana.jsx','reactSelfContained':'RancaCana.embedded.jsx','htmlPreview':'preview.html','svgPair':'RancaCana.svg','layerTree':'editable-layers.json'}}
for k,c in characters.items():
 manifest['editableVectors'][k]=[n['attributes'].get('id') for n in walk(c) if n['tag']=='path']
 body=root/'assets'/(k+'-body.webp');manifest['rasterBodies'][k]={'file':'assets/'+body.name,'sha256':hashlib.sha256(body.read_bytes()).hexdigest(),'dimensions':[741,532] if k=='ranca' else [745,528]}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Created self-contained HTML/SVG, named editable layers and React source with external/embedded body variants.')
