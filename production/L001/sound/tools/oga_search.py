# Поиск музыки CC0 на OpenGameArt: сохраняет страницы выдачи в <out>/search_<kw>.html и печатает найденные ролики.
# Запуск: python -I oga_search.py <out_dir> kw1 kw2 ...
# Тип 12 = Music, лицензия 4 = CC0 (таксономия OpenGameArt).
import sys, re, time, html, pathlib, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (research script)"}
for kw in sys.argv[2:]:
    q = urllib.parse.urlencode({"keys": kw, "field_art_type_tid[]": "12", "field_art_licenses_tid[]": "4",
                                "sort_by": "count", "sort_order": "DESC", "items_per_page": "48"})
    url = "https://opengameart.org/art-search-advanced?" + q
    try:
        h = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read().decode("utf-8", "replace")
    except Exception as e:
        print("ERR", kw, e)
        continue
    (out / f"search_{re.sub(r'[^a-z0-9]+', '_', kw.lower())}.html").write_text(h, encoding="utf-8")
    items = re.findall(r'<span class="art-preview-title"><a href="(/content/[^"]+)">([^<]+)</a>', h)
    print(f"== {kw}: {len(items)}")
    for href, t in items[:30]:
        print(f"   {html.unescape(t)}  https://opengameart.org{href}")
    time.sleep(1.5)
