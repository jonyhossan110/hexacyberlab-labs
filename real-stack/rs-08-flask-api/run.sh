#!/usr/bin/env bash
# HexaFit (RS-08) — one-command start, same idea as the gateway launcher.
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "First start: creating a virtual environment and installing Flask…"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --quiet flask
exec python app.py
