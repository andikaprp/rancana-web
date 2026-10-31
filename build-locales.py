"""Build crawlable locale pages; run with Python + lxml after editing source HTML."""
from pathlib import Path
from lxml import html, etree
import json, re
ROOT=Path(__file__).resolve().parent
ORIGIN='https://rancana.id'
PLAY='https://play.google.com/store/apps/details?id=com.planora.labs'
DEVELOPER='https://play.google.com/store/apps/dev?id=4897195411202652501'
INSTAGRAM='https://www.instagram.com/rancana.app/'
TIKTOK='https://www.tiktok.com/@rancana.id'
X_PROFILE='https://x.com/rancanaid'
PAGES=['index.html','help.html','premium.html','privacy.html','terms.html','delete-account.html','about.html','college-schedule.html','flashcard-guide.html','articles.html','todo-guide.html','flashcard-hafalan.html','jadwal-belajar.html','todo-tugas.html','tka-2026.html','jadwal-belajar-ujian.html']
# Indonesian-only pages: built to /id/ only, no hreflang pair, no legacy root route (source excluded via .assetsignore).
ID_ONLY_PAGES=['tka-2026.html','jadwal-belajar-ujian.html']
ARTICLE_PAGES=['college-schedule.html','todo-guide.html','flashcard-guide.html','flashcard-hafalan.html','jadwal-belajar.html','todo-tugas.html','tka-2026.html','jadwal-belajar-ujian.html']
# Dated SEO landing pages (layout v2): Article dates + headline from H1, BreadcrumbList, FAQPage from the visible FAQ.
SEO_LANDING_PAGES={'jadwal-belajar-ujian.html':{'published':'2026-10-29','modified':'2026-10-29'}}
LASTMOD='2026-10-29'
OG_IMAGE=ORIGIN+'/assets/rancana-og-mascot-square-20261017.png'
def locale_url(page, lang):
 return ORIGIN+'/'+lang+'/'+('' if page=='index.html' else page.removesuffix('.html'))
def canonical_links(tree, lang, legacy=False):
 for link in tree.xpath('//a[@href]'):
  value=link.get('href');path,sep,fragment=value.partition('#')
  if link.get('data-locale-page'):
   path=link.get('data-locale-page')+'.html';fragment=link.get('data-locale-fragment','');sep='#' if fragment else ''
  if path not in PAGES:continue
  link.set('href',locale_url(path,lang).removeprefix(ORIGIN)+sep+fragment)
  if legacy:
   link.set('data-locale-page',path.removesuffix('.html'))
   if fragment:link.set('data-locale-fragment',fragment)
  else:
   link.attrib.pop('data-locale-page',None);link.attrib.pop('data-locale-fragment',None)
def metadata(tree, page, lang, canonical):
 head=tree.find('head')
 for e in head.xpath('link[@rel="canonical"] | link[@hreflang] | meta[starts-with(@property,"og:")] | meta[starts-with(@name,"twitter:")] | script[@type="application/ld+json"]'):head.remove(e)
 def add(tag,attrs,text=None):
  e=etree.SubElement(head,tag,attrs);e.text=text;return e
 add('link',{'rel':'canonical','href':canonical})
 if page not in ID_ONLY_PAGES:
  for l in ['id','en']:add('link',{'rel':'alternate','hreflang':l,'href':locale_url(page,l)})
  add('link',{'rel':'alternate','hreflang':'x-default','href':locale_url(page,'id')})
 title_element=head.find('title');description_element=head.xpath('meta[@name="description"]')[0]
 title=(title_element.get('data-id') if lang=='id' else None) or title_element.get('data-en') or title_element.text or 'Rancana';desc=(description_element.get('data-id') if lang=='id' else None) or description_element.get('data-en') or description_element.get('content')
 # Every page shares the 1200×1200 homepage card; the 180px app icon is too small for chat/social previews.
 image=OG_IMAGE
 for key,value in {'type':'article' if page in ARTICLE_PAGES else 'website','site_name':'Rancana','title':title,'description':desc,'url':canonical,'locale':'id_ID' if lang=='id' else 'en_US','image':image}.items():add('meta',{'property':'og:'+key,'content':value})
 alt='Maskot Ranca menemani Rancana dengan fitur jadwal kelas, to-do, dan flashcard.' if lang=='id' else 'Ranca, the smiling green cloud mascot, alongside Rancana’s class schedule, to-do, and flashcard features.'
 for key,value in {'width':'1200','height':'1200','alt':alt}.items():add('meta',{'property':'og:image:'+key,'content':value})
 add('meta',{'name':'twitter:card','content':'summary'})
 add('meta',{'name':'twitter:image','content':image})
 add('meta',{'name':'twitter:image:alt','content':alt})
 website={'@type':'WebSite','@id':ORIGIN+'/#website','name':'Rancana','url':ORIGIN+'/','publisher':{'@id':ORIGIN+'/#organization'}}
 data={'@type':'WebPage','@id':canonical+'#webpage','name':title,'description':desc,'url':canonical,'inLanguage':lang,'isPartOf':{'@id':website['@id']}}
 if page in ARTICLE_PAGES:
  data['@type']='Article';data['headline']=title;data['author']={'@type':'Organization','name':'Rancana'}
 if page=='articles.html':data['@type']='CollectionPage'
 organization={'@type':'Organization','@id':ORIGIN+'/#organization','name':'Rancana','url':ORIGIN+'/','sameAs':[DEVELOPER,INSTAGRAM,TIKTOK,X_PROFILE],'logo':ORIGIN+'/assets/app-icon-180.png'}
 app={'@type':'SoftwareApplication','@id':ORIGIN+'/#android-app','name':'Rancana','alternateName':'Rancana: Jadwal & Flashcard','url':ORIGIN+'/','sameAs':[PLAY,INSTAGRAM,TIKTOK,X_PROFILE],'installUrl':PLAY,'applicationCategory':'EducationalApplication','operatingSystem':'Android','publisher':{'@id':organization['@id']},'description':'Rancana adalah aplikasi Android untuk mengatur pelajaran, jadwal kelas, to-do list, dan flashcard.' if lang=='id' else 'Rancana is an Android app for organizing subjects, class schedules, to-do lists, and flashcards.'}
 if page=='index.html':data['mainEntity']={'@id':app['@id']}
 if page in ['articles.html']+ARTICLE_PAGES:data['about']={'@id':app['@id']}
 if data['@type']=='Article':
  data['author']={'@id':organization['@id']};data['publisher']={'@id':organization['@id']}
 graph=[website,data,organization,app]
 if page in SEO_LANDING_PAGES:
  dates=SEO_LANDING_PAGES[page];h1=tree.xpath('//h1')[0].text_content().strip()
  data.update({'headline':h1,'datePublished':dates['published'],'dateModified':dates['modified'],'image':OG_IMAGE,'breadcrumb':{'@id':canonical+'#breadcrumb'}})
  crumbs=[('Beranda',ORIGIN+'/id/'),('Artikel',ORIGIN+'/id/articles'),(h1,canonical)]
  graph.append({'@type':'BreadcrumbList','@id':canonical+'#breadcrumb','itemListElement':[{'@type':'ListItem','position':i+1,'name':n,'item':u} for i,(n,u) in enumerate(crumbs)]})
  # FAQPage mirrors the visible h3/p pairs, so schema and page text cannot drift apart.
  faq=[(q.text_content().strip(),q.getnext().text_content().strip()) for q in tree.xpath('//section[contains(@class,"article-faq")]/h3')]
  if faq:graph.append({'@type':'FAQPage','@id':canonical+'#faq','mainEntity':[{'@type':'Question','name':q,'acceptedAnswer':{'@type':'Answer','text':a}} for q,a in faq]})
 add('script',{'type':'application/ld+json'},json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False))
for page in PAGES:
 source=ROOT/page
 for lang in (['id'] if page in ID_ONLY_PAGES else ['id','en']):
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
   l=e.get('data-set-lang');e.tag='a';e.attrib.clear();e.set('class','lang-btn'+(' is-active' if l==lang else ''));e.set('href',locale_url(page,l).removeprefix(ORIGIN));e.set('lang',l);e.set('hreflang',l)
   if l==lang:e.set('aria-current','page')
  canonical_links(tree,lang)
  for e in tree.xpath('//*[@src or @href]'):
   for attr in ['src','href']:
    value=e.get(attr)
    if not value or re.match(r'^(?:https?:|mailto:|#|/|\.\./)',value):continue
    path,sep,fragment=value.partition('#')
    if path in PAGES:e.set(attr,'../'+lang+'/'+path+sep+fragment)
    else:e.set(attr,'../'+value)
  for e in tree.xpath('//*[@srcset]'):
   e.set('srcset',', '.join(c if re.match(r'^(?:https?:|/|\.\./)',c) else '../'+c for c in (c.strip() for c in e.get('srcset').split(','))))
  # Translate descriptive alt text independently of client-side swapping.
  if lang=='id':
   alts={'Rancana home screen in the monochrome theme':'Beranda Rancana dengan tema monokrom','Rancana home screen in the pink theme':'Beranda Rancana dengan tema pink','Rancana home screen with a flashcard in the green theme':'Beranda dan flashcard Rancana dengan tema hijau','Flashcard front showing the title Introduction':'Bagian depan flashcard dengan judul Introduction','Flashcard back showing the formula a² + b² = c²':'Bagian belakang flashcard dengan rumus a² + b² = c²'}
   for e in tree.xpath('//img[@alt]'):e.set('alt',alts.get(e.get('alt'),e.get('alt')))
  metadata(tree,page,lang,locale_url(page,lang))
  target=ROOT/lang/page;target.parent.mkdir(exist_ok=True);target.write_text('<!doctype html>\n'+html.tostring(tree,encoding='unicode',method='html'))
 if page in ID_ONLY_PAGES:continue
 # Legacy route retains live language switch; canonical consolidates to static default locale.
 tree=html.fromstring(source.read_text())
 canonical_links(tree,'id',legacy=True)
 for e in tree.xpath('//head/title[@data-id]|//head/meta[@name="description" and @data-id]'):
  if not e.get('data-en'):e.set('data-en',e.get('content') if e.tag=='meta' else e.text)
  if e.tag=='meta':e.set('content',e.get('data-id'))
  else:e.text=e.get('data-id')
 metadata(tree,page,'id',locale_url(page,'id'))
 source.write_text('<!doctype html>\n'+html.tostring(tree,encoding='unicode',method='html'))
indexable=[page for page in PAGES if not html.fromstring((ROOT/page).read_text()).xpath('//meta[@name="robots" and contains(@content,"noindex")]')]
urls=[locale_url(page,lang) for lang in ['id','en'] for page in indexable if lang=='id' or page not in ID_ONLY_PAGES]
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join('<url><loc>'+u+'</loc><lastmod>'+LASTMOD+'</lastmod></url>'for u in urls)+'</urlset>')
# Preserve crawler/training preferences; only ensure our sitemap is discoverable.
robots=ROOT/'robots.txt';text=robots.read_text() if robots.exists() else ''
directive='Sitemap: '+ORIGIN+'/sitemap.xml'
if not any(line.strip().lower()==directive.lower() for line in text.splitlines()):
 robots.write_text(text+('' if not text or text.endswith('\n') else '\n')+directive+'\n')
print(f'Built {len(PAGES)*2-len(ID_ONLY_PAGES)} static locale pages; sitemap has {len(urls)} indexable URLs')
