#!/usr/bin/env bash
# Машинная проверка настроения кандидатов (AudioSet-теги earshot) на отрезке трека.
# Запуск: bash music_earshot.sh <music_dir> <start_s> <end_s> id1 id2 ...
# Результат: <music_dir>/analysis/<id>.earshot.json
set -u
EAR=/c/dev/tools/earshot/.venv/Scripts/earshot.exe
MD="$1"; S="$2"; E="$3"; shift 3
for id in "$@"; do
  f=$(ls "$MD/candidates/$id".* 2>/dev/null | head -1)
  if [ -z "$f" ]; then echo "MISS $id"; continue; fi
  if "$EAR" describe "$f" --start "$S" --end "$E" --top 8 --json --out "$MD/analysis/$id.earshot.json" > /dev/null 2>&1; then
    echo "ok  $id"
  else
    echo "ERR $id"
  fi
done
echo "done"
