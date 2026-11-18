# Сводка по сохранённым страницам OpenGameArt: заголовок, автор, лицензия, теги, описание, файлы.
# Запуск: python -I oga_page_info.py <папка со страницами .html>
import re, sys, html, pathlib, json

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def text(s):
    s = re.sub(r"<script[\s\S]*?</script>|<style[\s\S]*?</style>", " ", s)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


out = []
for f in sorted(pathlib.Path(sys.argv[1]).glob("*.html")):
    h = f.read_text(encoding="utf-8", errors="replace")
    title = re.search(r"<title>([^<|]*)", h)
    author = re.search(r'field-name-author-submitter[\s\S]*?<a [^>]*href="/users/([^"]+)"[^>]*>([^<]+)</a>', h)
    lic = re.findall(r'field-name-field-art-licenses[\s\S]*?</div>\s*</div>\s*</div>', h)
    lic_names = re.findall(r'class="license-name">([^<]+)<', h)
    tags = re.findall(r'href="/art-search-advanced\?field_art_tags_tid=[^"]*">([^<]+)</a>', h)
    body = re.search(r'field-name-body[\s\S]*?<div class="field-item even"[^>]*>([\s\S]*?)</div>', h)
    files = sorted(set(re.findall(r'<a href="(https://opengameart.org/sites/default/files/[^"]+\.(?:mp3|ogg|wav|flac|zip))"', h)))
    date = re.search(r'field-name-post-date[\s\S]*?<div class="field-item even">([^<]+)<', h)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', h)
    out.append({
        "page": f.name,
        "url": canon.group(1) if canon else None,
        "title": title.group(1).strip() if title else None,
        "author": author.group(2).strip() if author else None,
        "licenses": lic_names,
        "date": date.group(1).strip() if date else None,
        "tags": tags,
        "desc": text(body.group(1))[:500] if body else None,
        "files": files,
    })
print(json.dumps(out, ensure_ascii=False, indent=1))
