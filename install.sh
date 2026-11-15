#!/usr/bin/env bash
# install.sh — установка всего нужного на macOS / Linux одной командой:  bash install.sh
# Ставит недостающие Node.js, ffmpeg, Python (brew или apt), затем запускает tools/bootstrap.mjs.
set -u
have() { command -v "$1" >/dev/null 2>&1; }
if [[ "$(uname)" == "Darwin" ]]; then
  if ! have brew; then echo "Нет Homebrew: поставь с https://brew.sh и запусти снова"; exit 1; fi
  have node || brew install node
  have ffmpeg || brew install ffmpeg
  have python3 || brew install python
  [[ -d "/Applications/Google Chrome.app" ]] || brew install --cask google-chrome
else
  if have apt-get; then
    have node || sudo apt-get install -y nodejs npm
    have ffmpeg || sudo apt-get install -y ffmpeg
    have python3 || sudo apt-get install -y python3 python3-pip
  else
    echo "Поставь вручную: Node.js 18+, ffmpeg, Python 3.10+, Chrome"
  fi
fi
node tools/bootstrap.mjs "$@"
