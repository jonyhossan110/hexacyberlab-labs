package main

/* HexaFiles — a small file-sharing service written in Go, the way small Go
   services really get written: one static binary, net/http, a SQLite file,
   templates, and a few decisions the team would regret later.

   RS-10 · Real Stack Lab. Runs on localhost only, as training software. */

import (
	_ "embed"
	"fmt"
	"html"
	"math/rand"
	"net/http"
	_ "net/http/pprof" // the profiler is imported "just for staging" — it ships in the binary
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

//go:embed assets/style.css
var styleCSS []byte

var labRoot string

func init() {
	wd, err := os.Getwd()
	if err != nil {
		panic(err)
	}
	labRoot = wd
}

/* ---------------------------------- log ---------------------------------- */

var logMu sync.Mutex

// appLog writes the application's own log — the blue team reads this file.
func appLog(r *http.Request, line string) {
	logMu.Lock()
	defer logMu.Unlock()
	dir := filepath.Join(labRoot, "logs")
	_ = os.MkdirAll(dir, 0755)
	who := "guest"
	if r != nil {
		if c, err := r.Cookie("hexafiles_session"); err == nil {
			sessMu.Lock()
			if s, ok := sessions[c.Value]; ok {
				who = s.Email
			}
			sessMu.Unlock()
		}
	}
	ip := "-"
	if r != nil {
		ip = r.RemoteAddr
	}
	entry := fmt.Sprintf("[%s] %s %s %s\n", time.Now().Format("2006-01-02 15:04:05"), ip, who, line)
	f, err := os.OpenFile(filepath.Join(dir, "app.log"), os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err == nil {
		_, _ = f.WriteString(entry)
		_ = f.Close()
	}
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/debug/pprof/") {
			pass("pprof-exposure") // the profiler answered a request from the network
			appLog(r, "PPROF served "+r.URL.Path)
		}
		q := ""
		if r.URL.RawQuery != "" {
			q = "?" + r.URL.RawQuery
		}
		appLog(r, r.Method+" "+r.URL.Path+q)
		next.ServeHTTP(w, r)
	})
}

/* -------------------------------- sessions -------------------------------- */

type session struct {
	UserID int
	Email  string
}

var sessions = map[string]session{}
var sessMu sync.Mutex

// makeSessionToken mints a session token. The flaw, in one idiom: the PRNG is
// math/rand seeded with the current Unix second, and the token is a pure
// function of (user id, second). Anyone who knows roughly when a login
// happened — or just tries recent seconds — can mint a token for any user.
func makeSessionToken(userID int, seed int64) string {
	rng := rand.New(rand.NewSource(seed))
	return fmt.Sprintf("%d-%016x%016x", userID, rng.Int63(), rng.Int63())
}

// tokenMatchesScheme reports whether a presented token is a valid product of
// the minting scheme for some recent second, even if this server never issued
// it at login. The auth layer below accepts that as proof of identity — which
// is exactly why the scheme is broken.
func tokenMatchesScheme(tok string) (int, bool) {
	parts := strings.SplitN(tok, "-", 2)
	if len(parts) != 2 {
		return 0, false
	}
	uid, err := strconv.Atoi(parts[0])
	if err != nil || uid <= 0 {
		return 0, false
	}
	now := time.Now().Unix()
	for s := now; s > now-7200; s-- { // two hours of seconds — cheap to search
		if makeSessionToken(uid, s) == tok {
			return uid, true
		}
	}
	return 0, false
}

func currentUser(r *http.Request) *User {
	c, err := r.Cookie("hexafiles_session")
	if err != nil {
		return nil
	}
	sessMu.Lock()
	s, ok := sessions[c.Value]
	sessMu.Unlock()
	if ok {
		return userByID(s.UserID)
	}
	// Not a token this process issued. If it matches the minting scheme, the
	// app still accepts it — and that acceptance is the scored test.
	if uid, forged := tokenMatchesScheme(c.Value); forged {
		if u := userByID(uid); u != nil {
			pass("session-predictable")
			appLog(r, "SESSION accepted a scheme-minted token that was never issued at login, for "+u.Email)
			sessMu.Lock()
			sessions[c.Value] = session{UserID: u.ID, Email: u.Email}
			sessMu.Unlock()
			return u
		}
	}
	return nil
}

func startSession(w http.ResponseWriter, u *User) {
	tok := makeSessionToken(u.ID, time.Now().Unix())
	sessMu.Lock()
	sessions[tok] = session{UserID: u.ID, Email: u.Email}
	sessMu.Unlock()
	http.SetCookie(w, &http.Cookie{Name: "hexafiles_session", Value: tok, Path: "/"})
}

func endSession(w http.ResponseWriter, r *http.Request) {
	if c, err := r.Cookie("hexafiles_session"); err == nil {
		sessMu.Lock()
		delete(sessions, c.Value)
		sessMu.Unlock()
	}
	http.SetCookie(w, &http.Cookie{Name: "hexafiles_session", Value: "", Path: "/", MaxAge: -1})
}

func requireUser(w http.ResponseWriter, r *http.Request) *User {
	u := currentUser(r)
	if u == nil {
		http.Redirect(w, r, "/login?return="+r.URL.Path, http.StatusFound)
		return nil
	}
	return u
}

/* --------------------------------- layout --------------------------------- */

func esc(s string) string { return html.EscapeString(s) }

func labBar() string {
	done := doneCount()
	total := len(testDefs)
	pct := 0
	if total > 0 {
		pct = done * 100 / total
	}
	return fmt.Sprintf(`<div class="labbar"><span>⬢ <b>RS-10 · Real Stack Lab</b> — Go, the way real services are built</span>`+
		`<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests %d/%d</a><a href="/lab/guide">📖 Guide</a>`+
		`<a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (%d%%)</a></span></div>`,
		done, total, pct)
}

func render(w http.ResponseWriter, r *http.Request, title, body string) {
	u := currentUser(r)
	var nav string
	if u != nil {
		nav = fmt.Sprintf(`<a href="/files">My Files</a><a href="/search">Search</a><span style="margin-left:16px">%s · %d/%d downloads used</span><a href="/logout">Logout</a>`,
			esc(u.Email), u.DownloadsUsed, u.Quota)
	} else {
		nav = `<a href="/login">Login</a><a href="/register">Register</a>`
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, `<!DOCTYPE html><html><head><meta charset="utf-8"><title>%s · HexaFiles</title>`+
		`<link rel="stylesheet" href="/assets/style.css"></head><body>%s`+
		`<header class="app"><a class="logo" href="/">HexaFiles</a><nav>%s</nav></header><main>%s</main>`+
		`<footer class="foot">HexaFiles OÜ · Tallinn — a training app. Nothing here is real, no real files are stored.</footer></body></html>`,
		esc(title), labBar(), nav, body)
}

/* ---------------------------------- main ---------------------------------- */

func main() {
	if err := openDB(); err != nil {
		fmt.Fprintln(os.Stderr, "database error:", err)
		os.Exit(1)
	}
	mux := http.DefaultServeMux // pprof registered itself here at import time
	mux.HandleFunc("/assets/style.css", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/css")
		_, _ = w.Write(styleCSS)
	})
	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/register", registerHandler)
	mux.HandleFunc("/logout", logoutHandler)
	mux.HandleFunc("/files", filesHandler)
	mux.HandleFunc("/upload", uploadHandler)
	mux.HandleFunc("/file", fileHandler)
	mux.HandleFunc("/file/share", shareHandler)
	mux.HandleFunc("/download", downloadHandler)
	mux.HandleFunc("/search", searchHandler)
	mux.HandleFunc("/fetch", fetchHandler)
	mux.HandleFunc("/p/", publicHandler)
	mux.HandleFunc("/internal/metrics", metricsHandler)
	mux.HandleFunc("/lab/brief", labBriefHandler)
	mux.HandleFunc("/lab/tests", labTestsHandler)
	mux.HandleFunc("/lab/guide", labGuideHandler)
	mux.HandleFunc("/lab/review", labReviewHandler)
	mux.HandleFunc("/lab/logs", labLogsHandler)
	mux.HandleFunc("/lab/complete", labCompleteHandler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3210"
	}
	addr := "127.0.0.1:" + port
	fmt.Printf("⬢ HexaFiles (RS-10) — http://%s\n", addr)
	srv := &http.Server{Addr: addr, Handler: withLogging(mux)}
	if err := srv.ListenAndServe(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
