# Сводная таблица кандидатов из music_ledger.json и analysis/*.json (markdown в stdout).
# Запуск: python -I music_table.py <music_dir>
import sys, json, pathlib

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
md = pathlib.Path(sys.argv[1])
led = {r["id"]: r for r in json.loads((md / "music_ledger.json").read_text(encoding="utf-8"))}
rows = []
for p in sorted((md / "analysis").glob("*.json")):
    a = json.loads(p.read_text(encoding="utf-8"))
    if "id" not in a:
        continue
    L = led.get(a["id"], {})
    secs = " ".join(f"{s['label']}@{s['start_s']:.0f}" for s in a["sections"])
    loop = max(a["loops"], key=lambda x: x["similarity"]) if a.get("loops") else None
    loop_s = f"{loop['from_s']:.1f}→{loop['to_s']:.1f} ({loop['units']}{'т' if a['grid_unit']=='bar' else '×2с'}, {loop['similarity']:.2f})" if loop else "—"
    bpm = f"{a['tempo_bpm']:.0f}" if a["pulsed"] else f"нет пульса (~{a['tempo_raw_bpm']:.0f})"
    cat = L.get("catalog", {}).get("bpm") if L.get("catalog") else None
    rows.append((L.get("mood", "?"), a["id"], L.get("title", "?"), L.get("license", "?"), a["duration_s"], bpm, cat,
                 a.get("bar_s"), a["key"]["key"], a["key"]["corr"], a["lufs_integrated"], a["spectrum"]["1_4k_rel_dB"],
                 a["pulse_clarity"], secs, loop_s))
order = ["tension-bed", "spy-suspense", "noir-jazz", "warm-piano", "cold-drone", "driving-pulse", "dark-build", "sting"]
rows.sort(key=lambda r: (order.index(r[0]) if r[0] in order else 99, r[11]))
print("| Настроение | id | Трек | Лицензия | Длина, с | Темп | Каталог | Такт, с | Тональность (r) | LUFS | 1–4 кГц, дБ | Пульс | Разделы (метка@с) | Лучшая петля |")
print("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
for r in rows:
    print(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]:.0f} | {r[5]} | {r[6] or '—'} | {r[7] or '—'} | {r[8]} ({r[9]:.2f}) | "
          f"{r[10]} | {r[11]} | {r[12]:.2f} | {r[13]} | {r[14]} |")
