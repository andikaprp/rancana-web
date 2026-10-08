"""Build crawlable locale pages; run with Python + lxml after editing source HTML."""
from pathlib import Path
from lxml import html, etree
import json, re
ROOT=Path(__file__).resolve().parent
ORIGIN='https://rancana.id'
PAGES=['index.html','help.html','premium.html','privacy.html','terms.html','delete-account.html','about.html']
def locale_url(page, lang):
 return ORIGIN+'/'+lang+'/'+('' if page=='index.html' else page.removesuffix('.html'))
def metadata(tree, page, lang, canonical):
 head=tree.find('head')
 for e in head.xpath('link[@rel="canonical"] | link[@hreflang] | meta[starts-with(@property,"og:")] | meta[starts-with(@name,"twitter:")] | script[@type="application/ld+json"]'):head.remove(e)
 def add(tag,attrs,text=None):
  e=etree.SubElement(head,tag,attrs);e.text=text;return e
 add('link',{'rel':'canonical','href':canonical})
 for l in ['id','en']:add('link',{'rel':'alternate','hreflang':l,'href':locale_url(page,l)})
 add('link',{'rel':'alternate','hreflang':'x-default','href':locale_url(page,'id')})
 title_element=head.find('title');description_element=head.xpath('meta[@name="description"]')[0]
 title=(title_element.get('data-id') if lang=='id' else None) or title_element.get('data-en') or title_element.text or 'Rancana';desc=(description_element.get('data-id') if lang=='id' else None) or description_element.get('data-en') or description_element.get('content')
 for key,value in {'type':'website','site_name':'Rancana','title':title,'description':desc,'url':canonical,'locale':'id_ID' if lang=='id' else 'en_US','image':ORIGIN+'/assets/app-icon-180.png'}.items():add('meta',{'property':'og:'+key,'content':value})
 add('meta',{'name':'twitter:card','content':'summary'})
 data={'@context':'https://schema.org','@type':'WebPage','name':title,'description':desc,'url':canonical,'inLanguage':lang,'isPartOf':{'@type':'WebSite','name':'Rancana','url':ORIGIN}}
 if page=='index.html':data['mainEntity']={'@type':'SoftwareApplication','name':'Rancana','applicationCategory':'EducationalApplication','operatingSystem':'Android','url':'https://play.google.com/store/apps/details?id=com.planora.labs'}
 add('script',{'type':'application/ld+json'},json.dumps(data,ensure_ascii=False))
for page in PAGES:
 source=ROOT/page
 for lang in ['id','en']:
  tree=html.fromstring(source.read_text());tree.set('lang',lang)
  for e in tree.xpath('//*[@data-lang]'):
   if e.get('data-lang')!=lang:e.getparent().remove(e)
   else:e.attrib.pop('hidden',None);e.attrib.pop('data-lang',None)
  for e in tree.xpath('//*[@data-anchor]'):
   e.set('id',e.get('data-anchor'));e.attrib.pop('data-anchor',None)
  for e in tree.xpath('//*[@data-id]'):
   if lang=='id':
    value=e.get('data-id')
    if e.tag=='meta':e.set('content',value)
    else:
     for c in list(e):e.remove(c)
     e.text=None
     if e.tag=='title':e.text=value
     else:
      fragments=html.fragments_fromstring(value)
      for f in fragments:
       if isinstance(f,str):
        if len(e):e[-1].tail=(e[-1].tail or '')+f
        else:e.text=(e.text or '')+f
       else:e.append(f)
   if lang=='en' and e.get('data-en'):
    if e.tag=='meta':e.set('content',e.get('data-en'))
    else:e.text=e.get('data-en')
   e.attrib.pop('data-id',None);e.attrib.pop('data-en',None)
  for e in tree.xpath('//script[@src="lang.js"]'):e.getparent().remove(e)
  for e in tree.xpath('//button[@data-set-lang]'):
   l=e.get('data-set-lang');e.tag='a';e.attrib.clear();e.set('class','lang-btn'+(' is-active' if l==lang else ''));e.set('href','../'+l+'/'+page);e.set('lang',l);e.set('hreflang',l)
   if l==lang:e.set('aria-current','page')
  for e in tree.xpath('//*[@src or @href]'):
   for attr in ['src','href']:
    value=e.get(attr)
    if not value or re.match(r'^(?:https?:|mailto:|#|\.\./)',value):continue
    path,sep,fragment=value.partition('#')
    if path in PAGES:e.set(attr,'../'+lang+'/'+path+sep+fragment)
    else:e.set(attr,'../'+value)
  # Translate descriptive alt text independently of client-side swapping.
  if lang=='id':
   alts={'Rancana home screen in the monochrome theme':'Beranda Rancana dengan tema monokrom','Rancana home screen in the pink theme':'Beranda Rancana dengan tema pink','Rancana home screen with a flashcard in the green theme':'Beranda dan flashcard Rancana dengan tema hijau','Flashcard front showing the title Introduction':'Bagian depan flashcard dengan judul Introduction','Flashcard back showing the formula a² + b² = c²':'Bagian belakang flashcard dengan rumus a² + b² = c²'}
   for e in tree.xpath('//img[@alt]'):e.set('alt',alts.get(e.get('alt'),e.get('alt')))
  metadata(tree,page,lang,locale_url(page,lang))
  target=ROOT/lang/page;target.parent.mkdir(exist_ok=True);target.write_text('<!doctype html>\n'+html.tostring(tree,encoding='unicode',method='html'))
 # Legacy route retains live language switch; canonical consolidates to static default locale.
 tree=html.fromstring(source.read_text())
 for e in tree.xpath('//head/title[@data-id]|//head/meta[@name="description" and @data-id]'):
  if not e.get('data-en'):e.set('data-en',e.get('content') if e.tag=='meta' else e.text)
  if e.tag=='meta':e.set('content',e.get('data-id'))
  else:e.text=e.get('data-id')
 metadata(tree,page,'id',locale_url(page,'id'))
 source.write_text('<!doctype html>\n'+html.tostring(tree,encoding='unicode',method='html'))
indexable=[page for page in PAGES if not html.fromstring((ROOT/page).read_text()).xpath('//meta[@name="robots" and contains(@content,"noindex")]')]
urls=[locale_url(page,lang) for lang in ['id','en'] for page in indexable]
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+u+'</loc></url>'for u in urls)+'</urlset>')
# Sitemap discovery only. No new crawler access or training rules.
(ROOT/'robots.txt').write_text('Sitemap: '+ORIGIN+'/sitemap.xml\n')
print(f'Built 14 static locale pages; sitemap has {len(urls)} indexable URLs')
