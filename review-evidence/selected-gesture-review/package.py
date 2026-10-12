from pathlib import Path
import base64
root=Path(__file__).resolve().parent
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="review.css">','<style>'+(root/'review.css').read_text()+'</style>')
for key in ['selected-glyphs','review']:
    script=(root/(key+'.js')).read_text()
    if key=='review':
        import json
        bodies={name:'data:image/webp;base64,'+base64.b64encode((root/(name+'-body.webp')).read_bytes()).decode() for name in ['ranca','cana']}
        script=script.replace("const {make,configs",'const bodies='+json.dumps(bodies)+';const {make,configs').replace("href:key+'-body.webp'",'href:bodies[key]')
    html=html.replace('<script src="'+key+'.js"></script>','<script>'+script+'</script>')
source='data:image/png;base64,'+base64.b64encode((root/'selected-first-review-sheet.png').read_bytes()).decode()
html=html.replace('selected-first-review-sheet.png',source)
(root.parent/'selected-gesture-output'/'selected-baseline-before-after.html').write_text(html)
