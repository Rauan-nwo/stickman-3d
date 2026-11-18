# Параллельная докачка файлов кандидатов в кеш _dl/<source>/files (music_fetch.py потом их не качает повторно).
# Запуск: python -I music_prefetch.py <candidates.json> <music_dir> <pieces.json> [threads]
import sys, json, pathlib, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
cand_path, music_dir, pieces_path = map(pathlib.Path, sys.argv[1:4])
threads = int(sys.argv[4]) if len(sys.argv) > 4 else 4
cands = json.loads(cand_path.read_text(encoding="utf-8"))
pieces = {p["title"]: p for p in json.loads(pieces_path.read_text(encoding="utf-8"))}
UA = {"User-Agent": "Mozilla/5.0 (music research script)"}

jobs = []
for c in reversed(cands):
    if c["source"] == "incompetech":
        fn = pieces[c["title"]]["filename"]
        url = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/" + urllib.parse.quote(fn)
    else:
        url = c["url"]
        fn = urllib.parse.unquote(url.rsplit("/", 1)[1])
    dest = music_dir / "_dl" / c["source"] / "files" / fn
    if not dest.exists():
        jobs.append((c["id"], url, dest))


def run(job):
    cid, url, dest = job
    try:
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600).read()
        if not dest.exists():
            tmp = dest.with_suffix(dest.suffix + ".part")
            tmp.write_bytes(data)
            tmp.replace(dest)
        return f"ok  {cid} {len(data)}"
    except Exception as e:
        return f"ERR {cid} {e!r}"


with ThreadPoolExecutor(threads) as ex:
    for msg in ex.map(run, jobs):
        print(msg, flush=True)
print("done", len(jobs))
