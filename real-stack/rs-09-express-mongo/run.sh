#!/bin/bash
# HexaSocial (RS-09) launcher — installs dependencies once, then starts the app.
cd "$(dirname "$0")"
if [ ! -d node_modules ]; then
  echo "Installing HexaSocial dependencies (first run only)…"
  npm install --no-audit --no-fund
fi
exec node server.js
