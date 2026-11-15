#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sfx_eleven.py: звуковой эффект по текстовому описанию (ElevenLabs Sound Effects) -> кешированный WAV в папке фильма.

    python engine/tools/sfx_eleven.py <папка фильма> --name splash --prompt "A heavy object ..." --dur 3
                                      [--influence 0.5] [--budget 2500] [--dry]
    python engine/tools/sfx_eleven.py <папка фильма> --batch prompts.json [--budget 2500] [--dry]
        prompts.json: [{"name": "...", "prompt": "...", "dur": 3, "influence": 0.5}, ...]
    python engine/tools/sfx_eleven.py <папка фильма> --report       # сколько потрачено по журналу

Результат: <фильм>/audio/gen/<name>_<hash8>.mp3 и .wav (44.1 кГц, стерео) + запись в <фильм>/audio/gen/gen_log.json:
описание, длительность, оценка расхода кредитов, файл, дата.
Кеш: ключ = sha1(описание | длительность | влияние). То же описание второй раз НЕ отправляется — берётся файл.
Бюджет: сумма оценок по журналу + новый запрос не должна превышать --budget (по умолчанию 2500), иначе отказ.
Расход: 10 кредитов за секунду заказанной длительности (проверено по остатку в аккаунте и по заголовку ответа
`character-cost`); по этой цифре считается бюджет. Остаток: `--account`.
Ключ: переменная ELEVENLABS_API_KEY или файл raw/_secrets/voice-api-key.txt в корне проекта. Ключ не печатается.
В запросе уходит только текст описания звука — ничего о проекте и авторе.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
URL = "https://api.elevenlabs.io/v1/sound-generation"
PER_SECOND = 10        # кредитов за секунду: подтверждено остатком в аккаунте (62.2 с = 622 кредита), а не 40, как ожидалось


def api_key():
    k = os.environ.get("ELEVENLABS_API_KEY")
    if not k:
        p = os.path.join(ROOT, "raw", "_secrets", "voice-api-key.txt")
        if os.path.exists(p):
            k = open(p, encoding="utf-8").read()
    if not k or not k.strip():
        sys.exit("нет ключа: ELEVENLABS_API_KEY или raw/_secrets/voice-api-key.txt")
    return k.strip()


def load_log(gen):
    p = os.path.join(gen, "gen_log.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else []


def save_log(gen, log):
    json.dump(log, open(os.path.join(gen, "gen_log.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)


def spent(log):
    return sum(e.get("credits_server_header") or e.get("credits_estimate", 0) for e in log)


def generate(film, name, prompt, dur, influence=0.5, budget=2500, dry=False):
    gen = os.path.join(film, "audio", "gen")
    os.makedirs(gen, exist_ok=True)
    dur = max(0.5, min(22.0, float(dur)))
    h = hashlib.sha1(("%s|%.2f|%.2f" % (prompt.strip(), dur, influence)).encode("utf-8")).hexdigest()
    log = load_log(gen)
    hit = next((e for e in log if e["hash"] == h and os.path.exists(os.path.join(gen, e["wav"]))), None)
    if hit:
        print("кеш: %s (%s)" % (hit["wav"], name))
        return os.path.join(gen, hit["wav"])
    est = int(round(dur * PER_SECOND))
    if spent(log) + est > budget:
        sys.exit("бюджет: потрачено %d + запрос %d > %d — отказ (%s)" % (spent(log), est, budget, name))
    if dry:
        print("dry: %s, %.1f с, ~%d кредитов" % (name, dur, est))
        return None
    body = json.dumps({"text": prompt.strip(), "duration_seconds": dur, "prompt_influence": influence}).encode("utf-8")
    req = urllib.request.Request(URL, data=body, headers={"xi-api-key": api_key(), "Content-Type": "application/json", "Accept": "audio/mpeg"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = r.read()
            cost = r.headers.get("character-cost") or r.headers.get("x-character-count")
    except urllib.error.HTTPError as e:
        sys.exit("ElevenLabs: HTTP %d: %s" % (e.code, e.read().decode("utf-8", "replace")[:300]))
    base = "%s_%s" % (name, h[:8])
    mp3, wav = os.path.join(gen, base + ".mp3"), os.path.join(gen, base + ".wav")
    open(mp3, "wb").write(data)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mp3, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s24le", wav], check=True)
    log.append({"name": name, "hash": h, "prompt": prompt.strip(), "duration_seconds": dur, "prompt_influence": influence,
                "credits_estimate": est, "credits_server_header": int(cost) if (cost and str(cost).isdigit()) else None,
                "mp3": base + ".mp3", "wav": base + ".wav", "date": time.strftime("%Y-%m-%d %H:%M")})
    save_log(gen, log)
    print("ok: %s, %.1f s, %d credits (header: %s); log total %d" % (base + ".wav", dur, est, cost, spent(log)))
    return wav


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("film")
    ap.add_argument("--name")
    ap.add_argument("--prompt")
    ap.add_argument("--dur", type=float, default=2.0)
    ap.add_argument("--influence", type=float, default=0.5)
    ap.add_argument("--budget", type=int, default=2500)
    ap.add_argument("--batch")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--account", action="store_true", help="остаток кредитов в аккаунте (ключ не печатается)")
    a = ap.parse_args()
    film = a.film if os.path.isabs(a.film) else os.path.join(os.getcwd(), a.film)
    if a.account:
        r = urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": api_key()}), timeout=30)
        d = json.load(r)
        print("tier %s: used %s of %s, left %s" % (d.get("tier"), d.get("character_count"), d.get("character_limit"),
                                                   (d.get("character_limit") or 0) - (d.get("character_count") or 0)))
        return
    if a.report:
        log = load_log(os.path.join(film, "audio", "gen"))
        print("запросов %d, секунд %.1f, кредитов %d" % (len(log), sum(e["duration_seconds"] for e in log), spent(log)))
        return
    jobs = json.load(open(a.batch, encoding="utf-8")) if a.batch else [{"name": a.name, "prompt": a.prompt, "dur": a.dur, "influence": a.influence}]
    for j in jobs:
        if not j.get("name") or not j.get("prompt"):
            sys.exit("нужны --name и --prompt (или --batch)")
        generate(film, j["name"], j["prompt"], j.get("dur", 2.0), j.get("influence", 0.5), a.budget, a.dry)
        if not a.dry:
            time.sleep(1.0)


if __name__ == "__main__":
    main()
