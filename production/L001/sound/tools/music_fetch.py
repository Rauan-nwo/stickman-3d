# Скачивает кандидатов музыки L001 и собирает реестр лицензий.
# Запуск (из любой папки): python -I music_fetch.py <candidates.json> <music_dir> <incompetech pieces.json>
#   скачанное сырьё -> <music_dir>/_dl/<source>/files/ (недоверенное, ничего оттуда не запускаем)
#   рабочие копии    -> <music_dir>/candidates/<id>.<ext>
#   реестр           -> <music_dir>/music_ledger.json
import sys, json, re, shutil, hashlib, time, html, pathlib, urllib.parse, urllib.request
import soundfile as sf

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
cand_path, music_dir, pieces_path = map(pathlib.Path, sys.argv[1:4])
cands = json.loads(cand_path.read_text(encoding="utf-8"))
pieces = {p["title"]: p for p in json.loads(pieces_path.read_text(encoding="utf-8"))}
UA = {"User-Agent": "Mozilla/5.0 (music research script)"}
INC_LIC = "https://creativecommons.org/licenses/by/4.0/"
CC0_LIC = "https://creativecommons.org/publicdomain/zero/1.0/"

MAGIC = [(b"ID3", "mp3"), (b"\xff\xfb", "mp3"), (b"\xff\xf3", "mp3"), (b"\xff\xf2", "mp3"),
         (b"OggS", "ogg"), (b"RIFF", "wav"), (b"fLaC", "flac")]


def kind(b):
    for m, k in MAGIC:
        if b.startswith(m):
            return k
    return None


def get(url, dest):
    if dest.exists() and dest.stat().st_size > 10000:
        return dest.read_bytes()
    req = urllib.request.Request(url, headers=UA)
    data = urllib.request.urlopen(req, timeout=120).read()
    dest.write_bytes(data)
    time.sleep(1.0)
    return data


def oga_license(page_html):
    m = re.search(r"License\(s\):([\s\S]*?)Collections:", page_html)
    if not m:
        return None
    t = re.sub(r"<[^>]+>", " ", m.group(1))
    return re.sub(r"\s+", " ", html.unescape(t)).strip()


ledger = []
for c in cands:
    src = c["source"]
    dl = music_dir / "_dl" / src / "files"
    dl.mkdir(parents=True, exist_ok=True)
    rec = {"id": c["id"], "mood": c["mood"], "title": c["title"], "source": src}
    try:
        if src == "incompetech":
            p = pieces[c["title"]]
            url = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + urllib.parse.quote(p["filename"])
            data = get(url, dl / p["filename"])
            rec.update({
                "artist": "Kevin MacLeod",
                "page_url": "https://incompetech.com/music/royalty-free/music.html (ISRC " + (p.get("isrc") or "?") + ")",
                "file_url": url, "isrc": p.get("isrc"),
                "catalog": {k: p.get(k) for k in ("genre", "bpm", "feel", "instruments", "length", "description")},
                "license": "CC BY 4.0", "license_url": INC_LIC,
                "license_checked": "incompetech.com/music/royalty-free/licenses/ (2026-11-17): блок кредита CC",
                "attribution": f"\"{c['title']}\" Kevin MacLeod (incompetech.com)\n"
                               "Licensed under Creative Commons: By Attribution 4.0\n"
                               "http://creativecommons.org/licenses/by/4.0/",
            })
        elif src == "opengameart":
            pages = music_dir / "_dl" / src / "pages"
            pages.mkdir(parents=True, exist_ok=True)
            ph = get(c["page"], pages / f"{c['id']}.html").decode("utf-8", "replace")
            lic = oga_license(ph)
            url = c["url"]
            data = get(url, dl / urllib.parse.unquote(url.rsplit("/", 1)[1]))
            rec.update({
                "artist": c["artist"], "page_url": c["page"], "file_url": url,
                "license": lic, "license_url": CC0_LIC if lic and lic.strip() == "CC0" else None,
                "license_checked": f"страница OpenGameArt (2026-11-17): License(s): {lic}",
                "attribution": None if lic == "CC0" else "ПРОВЕРИТЬ",
                "courtesy_credit": f"\"{c['title']}\" by {c['artist']} (opengameart.org), CC0",
            })
        else:
            raise ValueError("unknown source")
        k = kind(data[:4])
        if not k:
            raise ValueError(f"not audio, first bytes {data[:16]!r}")
        out = music_dir / "candidates" / f"{c['id']}.{k}"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(data)
        info = sf.info(str(out))
        rec.update({"file": f"candidates/{out.name}", "bytes": len(data),
                    "sha256": hashlib.sha256(data).hexdigest(),
                    "duration_s": round(info.frames / info.samplerate, 2),
                    "samplerate": info.samplerate, "channels": info.channels})
        print("ok ", c["id"], k, rec["duration_s"], rec.get("license"))
    except Exception as e:
        rec["error"] = repr(e)
        print("ERR", c["id"], e)
    ledger.append(rec)

(music_dir / "music_ledger.json").write_text(json.dumps(ledger, ensure_ascii=False, indent=1), encoding="utf-8")
print("ledger:", len(ledger), "errors:", sum(1 for r in ledger if "error" in r))
