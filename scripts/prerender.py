"""Pré-rendu SEO : exécute src/index.html dans Chrome headless et écrit le DOM rendu
(version française) dans public/index.html, pour que les moteurs et les aperçus de liens
voient le contenu. Le script de la page reste présent et reprend la main côté visiteur
(langue mémorisée, appels d'offres et catalogue en direct).

Usage : python3 scripts/prerender.py   (nécessite playwright et un Chrome/Chromium)
"""
import pathlib, re, sys, datetime
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "src" / "index.html", ROOT / "public" / "index.html"
SITE = "https://chad-intelligence.netlify.app/"
CHROME = next((p for p in ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"] if pathlib.Path(p).exists()), None)

with sync_playwright() as p:
    b = p.chromium.launch(**({"executable_path": CHROME} if CHROME else {}))
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.add_init_script("window.__PRERENDER = true; try { localStorage.removeItem('ci-lang'); } catch (e) {}")
    pg.goto(SRC.as_uri())
    pg.wait_for_timeout(1000)
    html = pg.content()
    b.close()

if errors:
    sys.exit("Erreurs JS pendant le rendu : " + "; ".join(errors))
html = html.replace("<html lang=\"fr\">", "<html lang=\"fr\">", 1)
if not html.lower().startswith("<!doctype"):
    html = "<!DOCTYPE html>\n" + html
html = html.replace("<head>", "<head>\n<!-- Fichier généré par scripts/prerender.py depuis src/index.html : ne pas éditer à la main. -->", 1)
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf-8")

today = datetime.date.today().isoformat()
(ROOT / "public" / "sitemap.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>{SITE}</loc><lastmod>{today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>
</urlset>
""", encoding="utf-8")
(ROOT / "public" / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: {SITE}sitemap.xml\n", encoding="utf-8")
words = len(re.sub(r"<script.*?</script>|<style.*?</style>|<[^>]+>", " ", html, flags=re.S).split())
print(f"OK : {OUT.relative_to(ROOT)} ({len(html)//1024} Ko, ~{words} mots visibles), sitemap.xml, robots.txt")
