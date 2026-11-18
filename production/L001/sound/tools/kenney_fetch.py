#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
kenney_fetch.py            download + unpack the Kenney audio packs (run with python -I)

Every pack goes to its own new dir lib/_dl/kenney/<pack>/ : <pack>.zip + x/ (unpacked, names sanitised).
Nothing from the archives is executed; only the zip is read. The page licence line and the licence file
inside each zip are recorded in lib/_dl/kenney/kenney_meta.json.
"""
import datetime
import json
import re
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "lib" / "_dl" / "kenney"
UA = "Mozilla/5.0 (compatible; asset-downloader/1.0)"
PACKS = ["impact-sounds", "interface-sounds", "ui-audio", "rpg-audio", "casino-audio", "digital-audio",
         "sci-fi-sounds"]


def get(url, ref=None):
    h = {"User-Agent": UA}
    if ref:
        h["Referer"] = ref
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=120) as r:
        return r.read()


def safe_extract(zp, dest):
    dest = dest.resolve()
    n = 0
    with zipfile.ZipFile(zp) as z:
        for info in z.infolist():
            name = info.filename.replace("\\", "/")
            if name.endswith("/"):
                continue
            parts = [p for p in name.split("/") if p not in ("", ".", "..")]
            if not parts or ":" in name:
                print("  skip suspicious name", name)
                continue
            out = dest.joinpath(*parts).resolve()
            if dest not in out.parents:
                print("  skip outside path", name)
                continue
            if Path(parts[-1]).suffix.lower() not in (".ogg", ".wav", ".mp3", ".flac", ".txt", ".url", ".png", ".md"):
                print("  skip type", name)
                continue
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_bytes(z.read(info))
            n += 1
    return n


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    meta_p = ROOT / "kenney_meta.json"
    meta = json.loads(meta_p.read_text(encoding="utf-8")) if meta_p.exists() else {}
    for p in PACKS:
        page = "https://kenney.nl/assets/" + p
        d = ROOT / p
        zp = d / (p + ".zip")
        if zp.exists() and p in meta:
            print("have", p)
            continue
        if d.exists() and any(d.iterdir()):
            sys.exit("dir not empty, refusing: %s" % d)
        d.mkdir(parents=True, exist_ok=True)
        html = get(page).decode("utf-8", "replace")
        lic = re.search(r"<td class='title text-muted'>License</td>\s*<td class='bold'><a href='([^']+)'[^>]*>([^<]+)</a>", html)
        did = re.search(r"data-download-id='([0-9a-f]+)'", html)
        title = re.search(r"<title>([^<]+)</title>", html)
        if not did:
            print("no download id", p)
            continue
        time.sleep(1.5)
        link = json.loads(get("https://kenney.nl/download-link/" + did.group(1), ref=page))["url"]
        time.sleep(1.0)
        data = get(link, ref=page)
        zp.write_bytes(data)
        n = safe_extract(zp, d / "x")
        lic_files = sorted(str(f.relative_to(d)).replace("\\", "/") for f in (d / "x").rglob("*")
                           if f.is_file() and "licen" in f.name.lower())
        lic_text = ""
        for lf in lic_files:
            lic_text += (d / lf).read_text(encoding="utf-8", errors="replace")
        meta[p] = {"page": page, "title": title.group(1).replace("&middot;", "-").strip() if title else p,
                   "page_licence": lic.group(2) if lic else None, "page_licence_url": lic.group(1) if lic else None,
                   "zip": str(zp.relative_to(HERE.parent)).replace("\\", "/"), "zip_bytes": len(data),
                   "n_files": n, "licence_files": lic_files, "licence_text": lic_text.strip(),
                   "downloaded": datetime.date.today().isoformat()}
        meta_p.write_text(json.dumps(meta, indent=1, ensure_ascii=False), encoding="utf-8")
        print("%-18s %6.1f MB  %3d files  page: %s  lic files: %s" % (p, len(data) / 1e6, n,
              meta[p]["page_licence"], lic_files), flush=True)
        time.sleep(2.0)


if __name__ == "__main__":
    main()
