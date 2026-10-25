#!/bin/bash
# HexaFiles (RS-10) launcher — builds the Go binary, then starts the app.
cd "$(dirname "$0")"
command -v go >/dev/null 2>&1 || export PATH="$PATH:/usr/local/go/bin"
go build -o hexafiles . && exec ./hexafiles
