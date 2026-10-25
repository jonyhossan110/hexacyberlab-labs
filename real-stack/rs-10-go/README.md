# RS-10 — HexaFiles: Go File-Sharing Service

**Real Stack Milestone 10** (after core Lab 100) · Go · net/http · database/sql · SQLite

A believable file-sharing service written the way small Go services really
get written: one static binary, the standard library's HTTP server, a
SQLite file, files on disk under `storage/` — and twelve scored security
tests that are detected server-side as you perform them. Several of the
flaws are Go-specific: the profiler that ships in the binary, a session
token minted from a clock-seeded PRNG, a download path joined but never
confined, and a quota counter raced by Go's own goroutines.

## Run it

Through the Hexa Gateway (recommended): start RS-10 from the dashboard.
Standalone:

```bash
bash run.sh          # go build -o hexafiles . && ./hexafiles
# open http://localhost:3210
```

Needs Go 1.21+ (module targets Go 1.23). The SQLite driver is
`modernc.org/sqlite` — pure Go, no cgo — downloaded as a module on first
build. The database (`data.sqlite`) and the storage folders are created
and seeded on first run. Delete `data.sqlite`, `progress.json` and
`storage/*` to reset (or use the gateway's Reset button). The port comes
from the `PORT` environment variable (default 3210).

## Seeded accounts

| Role | Email | Password |
|---|---|---|
| Admin | sara.lindqvist@hexafiles.example | Harbor!Admin31 |
| Customer | lars.pettersen@example.no | Sommer2023! |
| Customer | amelia.hart@example.co.uk | Teatime!42 |
| Customer | mikkel.lund@example.dk | Hygge#2024 |

…plus 4 more customers in the seed. Passwords are stored in **plaintext** —
one of the service's many problems, and fair game for your report. Free-tier
accounts have a download quota of 5 per day; that quota matters.

## Layout (the point of a real-stack lab)

```
main.go          entry point, routing, session scheme, request log, lab bar
store.go         SQLite schema + seed; users, file metadata, download log
handlers.go      the app: files, upload, download, search, fetch, share, public page
lab.go           brief, tests, guide, code review, logs, complete + report
progress.go      the lab's scoring (progress.json, same shape as core labs)
assets/          the stylesheet (embedded into the binary)
storage/         uploaded file bytes, one folder per user (created at runtime)
config.env       production config that was copied into the repo by mistake
```

## The 12 tests

Path traversal in the download handler · SQL injection in the string-built
search query · XSS via `text/template` on the public page · IDOR on file
metadata · SSRF in fetch-from-URL · CSRF on share settings · open redirect
on the login return URL · `/debug/pprof/` exposure · login brute force ·
race condition on the download quota · predictable session tokens
(timestamp-seeded PRNG) · one professional mini-report.

The completion code is `RS10-` plus the first 10 upper-cased hex chars of
SHA-256 of the string `rs-10-go:hexafiles`.

Work **black-box first**; the Code Review page is your second pass.
