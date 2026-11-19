#!/usr/bin/env bash
# chapter_runner.sh — звук по главам по мере готовности картинки, по одной тяжёлой задаче за раз.
#   bash sound/tools/chapter_runner.sh ch2_3 ch7_8@12:00 ch9_10@12:00 ch4_6 ch0_1   (глава@ЧЧ:ММ — картинка новее этого времени)
# Глава берётся в работу, когда film/out/<c>.mp4 есть, film/out/final_<c>_log.txt заканчивается «готово … <c>.mp4»
# (или film/out/<c>_flicker.txt — «ИТОГ»), лог не старше mp4 и mp4 не менялся 60 с. Сделанное помечается sound/out/<c>/.src_mtime (mtime картинки, на которой сведено);
# если картинку перерендерят — глава сводится заново. Выход — когда все главы сведены на текущей картинке.
# Журнал: sound/out/runner.log.
cd "$(dirname "$0")/../.." || exit 1          # production/L001
SP=/c/dev/tools/sound-venv/Scripts/python.exe; EP=/c/dev/tools/earshot/.venv/Scripts/python.exe
export PYTHONIOENCODING=utf-8
L=sound/out/runner.log; echo "[$(date +%H:%M)] старт: $*" >> $L
# глава@ЧЧ:ММ — брать картинку только новее этого времени сегодня (например, ch7_8@12:00 — ждать рендер после QA)
declare -A MIN; ARGS=()
for x in "$@"; do c=${x%%@*}; ARGS+=("$c"); [ "$x" != "$c" ] && MIN[$c]=$(date -d "today ${x#*@}" +%s); done
set -- "${ARGS[@]}"
ready() {  # $1 = глава
  local v=film/out/$1.mp4 lg=film/out/final_$1_log.txt fl=film/out/$1_flicker.txt
  [ -f "$v" ] || return 1
  if [ -f "$lg" ] && tail -3 "$lg" | grep -q "готово.*$1\.mp4"; then :          # рабочий B: final_<c>_log.txt
  elif [ -f "$fl" ] && tail -2 "$fl" | grep -q "ИТОГ"; then lg=$fl              # рабочий A: итог проверки мерцания после рендера
  else return 1; fi
  local mv=$(stat -c %Y "$v") ml=$(stat -c %Y "$lg") now=$(date +%s)
  [ "$ml" -ge "$mv" ] && [ $((now - mv)) -ge 60 ] || return 1
  [ -n "${MIN[$1]}" ] && [ "$mv" -le "${MIN[$1]}" ] && return 1
  local done=$(cat sound/out/$1/.src_mtime 2>/dev/null || echo 0)
  [ "$mv" != "$done" ]
}
pending() { for c in "$@"; do local v=film/out/$c.mp4; [ -f "$v" ] || return 0; local mv=$(stat -c %Y $v); [ -n "${MIN[$c]}" ] && [ "$mv" -le "${MIN[$c]}" ] && return 0; [ "$mv" = "$(cat sound/out/$c/.src_mtime 2>/dev/null)" ] || return 0; done; return 1; }
while pending "$@"; do
  did=0
  for c in "$@"; do
    ready "$c" || continue
    mv=$(stat -c %Y film/out/$c.mp4)
    echo "[$(date +%H:%M)] $c: картинка $(date -d @$mv +%H:%M:%S) — сведение" >> $L
    $SP sound/do_chapter.py film/out/$c.mp4 --density mid > sound/out/do_$c.log 2>&1; rc=$?
    if [ $rc -ne 0 ]; then   # сбой запуска процесса под нагрузкой рендера (0xC0000142) — повтор через минуту
      echo "[$(date +%H:%M)] $c: сбой ($(tail -1 sound/out/do_$c.log | cut -c1-160)) — повтор через 60 с" >> $L; sleep 60
      $SP sound/do_chapter.py film/out/$c.mp4 --density mid > sound/out/do_$c.log 2>&1; rc=$?
    fi
    tail -2 sound/out/do_$c.log >> $L
    if [ $rc -ne 0 ]; then echo "[$(date +%H:%M)] $c: ОШИБКА do_chapter ($rc)" >> $L; echo "$mv" > sound/out/$c/.src_mtime 2>/dev/null || { mkdir -p sound/out/$c; echo "$mv" > sound/out/$c/.src_mtime; }; continue; fi
    echo "[$(date +%H:%M)] $c: проверка голосов в фоне (вся глава)" >> $L
    $EP sound/tools/verify_vocals.py sound/out/$c --t1 99999 --hop .5 --rest-only --json sound/out/$c/vocals_full.json 2>&1 | grep -v -i warn >> $L
    echo "$mv" > sound/out/$c/.src_mtime
    [ "$(stat -c %Y film/out/$c.mp4)" != "$mv" ] && echo "[$(date +%H:%M)] $c: картинку перерендерили во время сведения — повторю" >> $L
    did=1; break          # после каждой главы — заново по списку (вдруг пришла новая картинка)
  done
  [ $did = 0 ] && sleep 30
done
echo "[$(date +%H:%M)] RUNNER_DONE" >> $L
