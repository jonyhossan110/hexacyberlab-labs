#!/usr/bin/env bash
# HexaClinic (RS-05) — one-command start, same idea as the gateway launcher.
cd "$(dirname "$0")"
if [ ! -d .venv ]; then
  echo "First start: creating a virtual environment and installing Django…"
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --quiet -r requirements.txt
python manage.py migrate --run-syncdb --noinput >/dev/null
python manage.py shell -c "from clinic.seed import seed_if_empty; seed_if_empty()" >/dev/null
exec python manage.py runserver "127.0.0.1:${PORT:-3205}" --noreload
