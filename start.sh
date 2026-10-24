#!/usr/bin/env bash
# HexaCyberLab — one-command launcher (Linux / macOS / Kali)
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js is not installed. Install Node.js 20+ (https://nodejs.org) and run this again.'
  exit 1
fi
echo '⬢ Starting the HexaCyberLab Gateway — open http://localhost:4000 in your browser'
echo '  Keep this terminal open: it is your live server console for every lab you start.'
node gateway/build-index.js >/dev/null 2>&1
node gateway/server.js
