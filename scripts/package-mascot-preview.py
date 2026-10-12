from pathlib import Path
import json,subprocess,zipfile
root=Path(__file__).resolve().parent.parent
out=root/'review-evidence/selected-A-website';out.mkdir(parents=True,exist_ok=True)
server='''import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.dirname(new URL(import.meta.url).pathname);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff':'font/woff','.woff2':'font/woff2'};
http.createServer(async(req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://local').pathname);if(p.endsWith('/'))p+='index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end('Not found');}}).listen(4173,'127.0.0.1',()=>console.log('Review preview: http://127.0.0.1:4173/id/ (or /en/)'));
'''
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
with zipfile.ZipFile(out/'selected-A-website-preview.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.iterdir()):
  if p.is_file() and p.suffix in ['.html','.css','.js'] and not p.name.startswith('review-'):z.write(p,p.name)
 for directory in ['id','en','assets']:
  for p in sorted((root/directory).rglob('*')):
   if p.is_file():z.write(p,str(p.relative_to(root)))
 z.writestr('preview-server.mjs',server)
 z.writestr('BUILD.json',json.dumps({'commit':commit,'sourceSelection':'8336f9994ecdce986ab8603b5507d909700c5aa6','reviewOnly':True},indent=2))
 z.writestr('PREVIEW-README.txt','Run node preview-server.mjs, then open http://127.0.0.1:4173/id/ or /en/.\nThis is the draft website implementation. No deployment is required. The same local asset files and motion modules are used as the reviewed commit.\n')
print('Packaged playable local website preview for',commit)
