package main

import (
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

/* The lab pages — brief, tests, guide, code review, blue-team logs, complete.
   Same shape as RS-01, in the app's own UI. */

type testDef struct {
	ID, Name, Hint string
}

var testDefs = []testDef{
	{"path-traversal", "Path traversal in the file download handler", "Downloads take a path under the storage folder and join it without confining it. Climb out with ../ and read files that were never uploaded — the app's own config, for instance."},
	{"sqli", "SQL Injection — string-built query", "File search builds its query by formatting strings. A quote in the search box changes what the WHERE clause means — whose files show up then?"},
	{"xss-text-template", "XSS — text/template instead of html/template", "The public share page was built separately from the rest of the app. Put markup in a file's description, make the file public, and open its public page."},
	{"idor-file", "IDOR — another user's file metadata", "The file details page loads by id alone. Walk the ids while logged in as a customer and see whose private files open."},
	{"ssrf-fetch", "SSRF — fetch-from-URL feature", "The import feature makes the server fetch any URL you hand it — including addresses only the server can reach. Its own internal status page, for example."},
	{"csrf-share", "CSRF — share settings without a token", "The share-settings form carries no token. Fire the POST from another origin (or with no Referer) while the owner is logged in."},
	{"open-redirect", "Open redirect on return URL", "The login page honours a return parameter and sends you there after a successful login — wherever 'there' is."},
	{"pprof-exposure", "Debug/pprof endpoint exposure", "Go services often ship their profiler. Ask the server for the standard debug paths and see if it answers."},
	{"brute-force", "Login brute force, no throttling", "Fail a login ten times for one account. Nothing slows down, nothing locks, nobody is told."},
	{"race-counter", "Race condition — download quota counter", "The quota is checked, then the file is served, then the counter is written from a stale value — three separate steps. Fire downloads in parallel and count what you actually got."},
	{"session-predictable", "Predictable session token (timestamp seed)", "Session tokens are minted from a PRNG seeded by the clock, in a format the Code Review shows exactly. Mint a valid token for the admin's user id without ever seeing hers."},
	{"report", "Mini report — one professional finding", "On the Complete page, write up one flaw like you would for a client: title, severity, evidence, impact, fix."},
}

func labBriefHandler(w http.ResponseWriter, r *http.Request) {
	render(w, r, "Client Brief", `<h1>📋 Engagement brief — HexaFiles OÜ</h1>`+
		`<p><b>Client:</b> HexaFiles OÜ, a (fictional) file-sharing startup in Tallinn. Their Go service was written by two engineers in 2023, raised a seed round on the promise of "bank-grade security", and has never had a security review. You are the assessor they finally hired.</p>`+
		`<p><b>Scope:</b> this application only — every route on this host and port. The seeded accounts and your own registered account are in scope. Other ports and other labs are <b>out of scope</b>, exactly as on a real engagement.</p>`+
		`<p><b>Rules of engagement:</b> no denial of service, no deleting other users' files beyond what a test needs to prove, and everything you do is logged (see the Logs page — the blue team is watching, like real life).</p>`+
		`<p><b>How scoring works:</b> twelve tests are scored server-side the moment your action is detected — for example, the server notices when a download actually leaves the storage folder, not before. Work black-box first; open the Code Review only for your second pass.</p>`+
		`<p><b>Deliverable:</b> at 100% you will write one mini finding in professional format on the Complete page.</p>`)
}

func labTestsHandler(w http.ResponseWriter, r *http.Request) {
	progMu.Lock()
	p := loadProgress()
	progMu.Unlock()
	var b strings.Builder
	fmt.Fprintf(&b, `<h1>🎯 RS-10 tests — %d/%d passed</h1><p class="muted">Detected server-side, the moment the action really happens. Hints point at the area, never the payload.</p>`, len(p.Tests), len(testDefs))
	for _, t := range testDefs {
		mark := "⬜"
		if p.Tests[t.ID] {
			mark = "✅"
		}
		fmt.Fprintf(&b, `<div class="review"><b>%s %s</b><p class="muted">%s</p></div>`, mark, esc(t.Name), esc(t.Hint))
	}
	render(w, r, "Tests", b.String())
}

func labGuideHandler(w http.ResponseWriter, r *http.Request) {
	render(w, r, "Real Website Guide", `<h1>📖 Real Website Guide — recognising a Go service</h1>`+
		`<h2>Fingerprint drill — prove it is Go before you test</h2><ul>`+
		`<li><b>No Server header:</b> Go's net/http sends none by default. A modern JSON/HTML service with no Server banner and terse errors is already suspicious.</li>`+
		`<li><b>The profiler:</b> <code>/debug/pprof/</code> is the classic Go tell — if it answers, the stack is proven and the internals are open.</li>`+
		`<li><b>Default 404:</b> plain text <code>404 page not found</code>, no HTML, no branding — the standard library's own voice.</li>`+
		`<li><b>Clean URLs, no extensions:</b> one static binary serves everything; there are no .php/.asp artefacts and rarely static-file fingerprints.</li>`+
		`<li><b>Cookies:</b> hand-rolled names (frameworks leave marks like PHPSESSID or sessionid; Go teams invent their own).</li></ul>`+
		`<h2>What to test first on a real Go service</h2><ol>`+
		`<li>Debug surface: /debug/pprof/, /debug/vars (expvar) — astonishingly often left in production binaries.</li>`+
		`<li>Session tokens: are they crypto/rand, or math/rand with a guessable seed? Collect your own tokens and study them.</li>`+
		`<li>File paths: Go's filepath.Join cleans a path but does NOT confine it — download handlers that join user input are a Go-specific trap.</li>`+
		`<li>Templates: html/template escapes; text/template does not. Pages that feel "separately built" are where the wrong one lives.</li>`+
		`<li>Concurrency: Go serves in parallel by default — any counter that is read, checked, then written is a race waiting for two requests.</li></ol>`+
		`<h2>Burp workflow for this lab</h2>`+
		`<p>Proxy the app and map it. Work the download path and the search box in <b>Repeater</b>. For the quota race, send the same download many times <b>in parallel</b> (Intruder with multiple threads, or Turbo Intruder) and compare downloads-served against the quota. For the session token, take one you were issued, note the second it was minted, and reproduce the scheme offline — the Code Review shows the exact recipe.</p>`+
		`<h2>The professional habit</h2>`+
		`<p>Note every flaw as: what, where, proof, impact. The Complete page will ask you to write one up properly — that write-up is what a client actually pays for.</p>`)
}

var reviewNotes = map[string]string{
	"main.go":     "Two flaws live here. The blank import of net/http/pprof registers /debug/pprof/ on the default mux — the profiler ships in the production binary. And session tokens are minted from math/rand seeded with the current Unix second; the auth layer accepts any token that matches the scheme, issued or not.",
	"store.go":    "Passwords are stored in plaintext, and the seed ships realistic-looking credentials for eight users. The database layer itself uses parameterised queries — the SQL injection is not here.",
	"handlers.go": "Most of the engagement lives in this file: search builds SQL with fmt.Sprintf; the download handler joins the path parameter without confining it to the storage folder; the quota is checked, served, then written back from a stale value (the race); the file page never checks ownership (IDOR); the share POST has no CSRF token; login honours any return URL; the fetch feature requests arbitrary URLs server-side; and the public share page is rendered with text/template, which escapes nothing.",
	"progress.go": "The lab's scoring, not part of the app under test: progress.json is written the moment a detection fires.",
	"lab.go":      "The lab pages themselves (brief, tests, guide, this review, logs, complete) — also not part of the app under test.",
}

var reviewOrder = []string{"handlers.go", "main.go", "store.go", "progress.go", "lab.go"}

func labReviewHandler(w http.ResponseWriter, r *http.Request) {
	f := r.URL.Query().Get("f")
	var b strings.Builder
	b.WriteString(`<h1>🔍 Code Review — second pass</h1><p class="muted">On a real engagement you often get the source after (or instead of) black-box testing. Read each file, find the flaw yourself first — the note under each file confirms what was there.</p>`)
	for _, name := range reviewOrder {
		note := reviewNotes[name]
		if f == name {
			code, err := os.ReadFile(filepath.Join(labRoot, name))
			if err != nil {
				code = []byte("(could not read file)")
			}
			fmt.Fprintf(&b, `<h2>%s</h2><div class="src"><pre>%s</pre></div><p><b>What was wrong:</b> %s</p>`, esc(name), esc(string(code)), esc(note))
		} else {
			fmt.Fprintf(&b, `<div class="review"><a href="/lab/review?f=%s"><b>%s</b></a><p class="muted">%s</p></div>`, name, esc(name), esc(note))
		}
	}
	render(w, r, "Code Review", b.String())
}

func labLogsHandler(w http.ResponseWriter, r *http.Request) {
	data, _ := os.ReadFile(filepath.Join(labRoot, "logs", "app.log"))
	lines := strings.Split(strings.TrimRight(string(data), "\n"), "\n")
	if len(lines) > 120 {
		lines = lines[len(lines)-120:]
	}
	render(w, r, "Blue-Team Corner", `<h1>🛡 Blue-team corner — what the defence sees</h1>`+
		`<p class="muted">This is the application's own log. After an attack, read your trail: which lines expose you, which look like ordinary file sharing? Real engagements are won and lost in this file.</p><pre class="log">`+
		esc(strings.Join(lines, "\n"))+`</pre>`)
}

// parseURLEncoded parses a form body splitting on & only. Go's standard
// form parser rejects semicolons, and findings are prose — semicolons and
// all. Browsers percent-encode properly; this parser simply never chokes.
func parseURLEncoded(raw []byte) map[string]string {
	vals := map[string]string{}
	for _, pair := range strings.Split(string(raw), "&") {
		kv := strings.SplitN(pair, "=", 2)
		if len(kv) != 2 {
			continue
		}
		k, err1 := url.QueryUnescape(kv[0])
		v, err2 := url.QueryUnescape(kv[1])
		if err1 == nil && err2 == nil {
			vals[k] = v
		}
	}
	return vals
}

func labCompleteHandler(w http.ResponseWriter, r *http.Request) {
	reportMsg := ""
	var form map[string]string
	if r.Method == http.MethodPost {
		raw, _ := io.ReadAll(io.LimitReader(r.Body, 1<<20))
		form = parseURLEncoded(raw)
	}
	if r.Method == http.MethodPost && form["do"] == "report" {
		title := strings.TrimSpace(form["title"])
		sev := form["severity"]
		ev := strings.TrimSpace(form["evidence"])
		imp := strings.TrimSpace(form["impact"])
		fix := strings.TrimSpace(form["fix"])
		if len(title) >= 8 && sev != "" && len(ev) >= 30 && len(imp) >= 20 && len(fix) >= 20 {
			progMu.Lock()
			p := loadProgress()
			p.Report = map[string]string{"title": title, "severity": sev, "evidence": ev, "impact": imp, "fix": fix, "at": time.Now().UTC().Format(time.RFC3339)}
			saveProgress(p)
			progMu.Unlock()
			pass("report")
			reportMsg = "✅ Finding recorded — that is the report test passed."
		} else {
			reportMsg = "The finding needs more substance: a clear title, a severity, real evidence (30+ characters), the business impact (20+) and a concrete fix (20+)."
		}
	}
	progMu.Lock()
	p := loadProgress()
	progMu.Unlock()
	n := len(p.Tests)
	var b strings.Builder
	fmt.Fprintf(&b, `<h1>🏁 RS-10 — %d/%d tests</h1>`, n, len(testDefs))
	if n < len(testDefs) {
		b.WriteString(`<p>Not complete yet. Still open:</p><ul>`)
		for _, t := range testDefs {
			if !p.Tests[t.ID] {
				fmt.Fprintf(&b, `<li>%s</li>`, esc(t.Name))
			}
		}
		b.WriteString(`</ul><p><a href="/lab/tests">Open the test list with hints</a></p>`)
	} else {
		b.WriteString(`<div class="cert"><h2>🎓 Real Stack Milestone RS-10 — Complete</h2>` +
			`<p>Go, tested like a professional: black-box first, code review second, one finding written up.</p>` +
			`<p>Completion code: <b>` + completionCode() + `</b></p></div>` +
			`<h2>Fix-the-code debrief</h2>` +
			`<div class="fix"><b>Path traversal</b><pre>Vulnerable:  full := filepath.Join(storageRoot, userPath)   // Join cleans, it does not confine
Fixed:       resolve the absolute path and require it to stay under the storage
             root (filepath.Rel must not start with ".."), or serve files by id only.</pre></div>` +
			`<div class="fix"><b>SQL injection</b><pre>Vulnerable:  fmt.Sprintf("... LIKE '%%%s%%'", q)
Fixed:       db.Query("... LIKE ?", "%"+q+"%") — database/sql parameters, always.</pre></div>` +
			`<div class="fix"><b>XSS via text/template</b><pre>Vulnerable:  text/template renders user text into HTML raw.
Fixed:       html/template for anything HTML — it escapes by context, automatically.</pre></div>` +
			`<div class="fix"><b>IDOR</b><pre>Vulnerable:  SELECT ... FROM files WHERE id = ?
Fixed:       ... WHERE id = ? AND owner_id = ?  (the session user), 404 otherwise.</pre></div>` +
			`<div class="fix"><b>SSRF</b><pre>Vulnerable:  the server fetches any URL the user supplies.
Fixed:       allow-list schemes/hosts, resolve the host and reject loopback,
             private and link-local IPs, and re-check after redirects.</pre></div>` +
			`<div class="fix"><b>CSRF + open redirect</b><pre>Vulnerable:  state-changing POSTs with no token; login returns to any URL.
Fixed:       per-session CSRF tokens on every POST form; redirect targets
             restricted to relative paths or an allow-list.</pre></div>` +
			`<div class="fix"><b>pprof in production</b><pre>Vulnerable:  import _ "net/http/pprof" in the shipped binary.
Fixed:       keep the profiler out of production builds, or serve it on a
             separate listener bound to localhost behind authentication.</pre></div>` +
			`<div class="fix"><b>Brute force</b><pre>Vulnerable:  unlimited password guesses.
Fixed:       rate-limit and back off per account and per IP (for example
             golang.org/x/time/rate), alert on bursts, add MFA for admins.</pre></div>` +
			`<div class="fix"><b>Quota race</b><pre>Vulnerable:  read the counter, check it, serve, write back a stale value.
Fixed:       one atomic statement: UPDATE users SET downloads_used = downloads_used + 1
             WHERE id = ? AND downloads_used < quota — and check rows affected.</pre></div>` +
			`<div class="fix"><b>Predictable session tokens</b><pre>Vulnerable:  math/rand seeded with the current second — mintable by anyone.
Fixed:       32 bytes from crypto/rand, opaque, stored server-side, rotated
             at login, expired on a schedule.</pre></div>` +
			`<h2>Business impact — what HexaFiles was risking</h2>` +
			`<p>Every private file a customer trusted to HexaFiles was readable by any other customer who changed a number; the whole user table was one search quote away; anyone could mint the admin's session without her password; and the profiler handed out the service's memory and goroutines to whoever asked. In business language: a breach disclosure to every customer, the seed round's "bank-grade" claim in ashes, and churn that no pricing page fixes — from flaws that took an afternoon to find and days to fix.</p>`)
	}
	b.WriteString(`<h2>✍ Mini report — one professional finding</h2>`)
	if reportMsg != "" {
		b.WriteString(`<p class="ok">` + esc(reportMsg) + `</p>`)
	}
	b.WriteString(`<form method="post" class="form"><input type="hidden" name="do" value="report">` +
		`<label>Finding title<input name="title" placeholder="e.g. Session tokens are predictable — full account takeover without a password" required></label>` +
		`<label>Severity<select name="severity"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></label>` +
		`<label>Evidence — what you sent and what came back<textarea name="evidence" required></textarea></label>` +
		`<label>Business impact — money, customers, trust<textarea name="impact" required></textarea></label>` +
		`<label>Recommended fix<textarea name="fix" required></textarea></label><button>Submit finding</button></form>`)
	render(w, r, "Complete", b.String())
}
