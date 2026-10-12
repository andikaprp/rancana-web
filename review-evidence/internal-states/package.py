from pathlib import Path
import base64
root=Path(__file__).resolve().parent
s=(root/'index.html').read_text().replace('<link rel="stylesheet" href="states.css">','<style>'+ (root/'states.css').read_text()+'</style>')
js=(root/'states.js').read_text()
images={key:'data:image/webp;base64,'+base64.b64encode((root/(key+'-body.webp')).read_bytes()).decode() for key in ['ranca','cana']}
import json
js=js.replace("const names=",'const bodyImages='+json.dumps(images)+';const names=').replace('href="${key}-body.webp"','href="${bodyImages[key]}"')
s=s.replace('<script src="states.js"></script>','<script>'+js+'</script>').replace('<script src="preview.js"></script>','<script>'+(root/'preview.js').read_text()+'</script>')
(root.parent/'internal-states-output'/'five-states-and-transitions.html').write_text(s)
