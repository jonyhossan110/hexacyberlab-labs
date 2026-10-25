package main

import (
	"bytes"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	texttemplate "text/template"
	"time"
)

/* ------------------------------- public home ------------------------------ */

func homeHandler(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path != "/" {
		http.NotFound(w, r) // the default mux 404 — plain text, very Go
		return
	}
	var b strings.Builder
	b.WriteString(`<section class="hero"><h1>Your files, everywhere</h1><p>HexaFiles keeps documents for small teams across Europe — upload, share a link, done. Free tier: 5 downloads a day, because bandwidth is not free.</p>`)
	if currentUser(r) == nil {
		b.WriteString(`<p><a href="/register">Create a free account</a> or <a href="/login">log in</a>.</p>`)
	} else {
		b.WriteString(`<p><a href="/files">Go to your files →</a></p>`)
	}
	b.WriteString(`</section><h2>Shared publicly by our users</h2><div class="grid">`)
	for _, f := range publicFiles() {
		fmt.Fprintf(&b, `<a class="card" href="/p/%d"><h3>%s</h3><p>%s</p><span class="muted">by %s · %s</span></a>`,
			f.ID, esc(f.Name), esc(f.Description), esc(f.OwnerName), humanSize(f.Size))
	}
	b.WriteString(`</div>`)
	render(w, r, "Home", b.String())
}

/* ---------------------------------- auth ---------------------------------- */

func loginHandler(w http.ResponseWriter, r *http.Request) {
	ret := r.FormValue("return")
	msg := ""
	if r.Method == http.MethodPost {
		email := r.FormValue("email")
		pw := r.FormValue("password")
		u := userByEmail(email)
		if u != nil && u.Password == pw {
			appLog(r, "LOGIN ok "+u.Email)
			startSession(w, u)
			if ret == "" {
				ret = "/files"
			}
			// the return URL is honoured without any check — open redirect
			if pu, err := url.Parse(ret); err == nil && pu.Host != "" && pu.Host != r.Host {
				pass("open-redirect")
				appLog(r, "LOGIN redirect left the site for "+pu.Host)
			}
			http.Redirect(w, r, ret, http.StatusFound)
			return
		}
		n := attempt("login:" + strings.ToLower(email))
		appLog(r, fmt.Sprintf("LOGIN fail %s (attempt %d)", email, n))
		if n >= 10 {
			pass("brute-force") // ten failures and nothing slows down, nothing locks
		}
		msg = "Invalid email or password."
	}
	body := `<h1>Login</h1>`
	if msg != "" {
		body += `<p class="err">` + esc(msg) + `</p>`
	}
	body += `<form method="post" class="form"><input type="hidden" name="return" value="` + esc(ret) + `">` +
		`<label>Email<input name="email" type="text" required></label>` +
		`<label>Password<input name="password" type="password" required></label><button>Log in</button></form>` +
		`<p class="muted">Demo customer: lars.pettersen@example.no / Sommer2023! — or register your own account.</p>`
	render(w, r, "Login", body)
}

func registerHandler(w http.ResponseWriter, r *http.Request) {
	msg := ""
	if r.Method == http.MethodPost {
		name := r.FormValue("name")
		email := r.FormValue("email")
		pw := r.FormValue("password")
		_, err := db.Exec("INSERT INTO users (name,email,password,role,quota) VALUES (?,?,?,'customer',5)", name, email, pw)
		if err != nil {
			msg = "Could not register: " + err.Error()
		} else {
			_ = os.MkdirAll(filepath.Join(storageRoot(), userSlug(email)), 0755)
			appLog(r, "REGISTER "+email)
			startSession(w, userByEmail(email))
			http.Redirect(w, r, "/files", http.StatusFound)
			return
		}
	}
	body := `<h1>Create your account</h1>`
	if msg != "" {
		body += `<p class="err">` + esc(msg) + `</p>`
	}
	body += `<form method="post" class="form"><label>Full name<input name="name" required></label>` +
		`<label>Email<input name="email" type="email" required></label>` +
		`<label>Password<input name="password" type="password" required></label><button>Register</button></form>` +
		`<p class="muted">Free tier: 5 downloads per day.</p>`
	render(w, r, "Register", body)
}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	endSession(w, r)
	http.Redirect(w, r, "/", http.StatusFound)
}

/* ---------------------------------- files --------------------------------- */

func filesHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil {
		return
	}
	var b strings.Builder
	fmt.Fprintf(&b, `<h1>My files</h1><p class="muted">Downloads used today: <b>%d / %d</b></p>`, u.DownloadsUsed, u.Quota)
	mine := listFiles(u.ID)
	if len(mine) == 0 {
		b.WriteString(`<p>No files yet — upload your first one below.</p>`)
	}
	b.WriteString(`<table><tr><th>Name</th><th>Visibility</th><th>Size</th><th>Downloads</th><th></th></tr>`)
	for _, f := range mine {
		dl := url.QueryEscape(strings.TrimPrefix(f.StoredPath, "storage/"))
		fmt.Fprintf(&b, `<tr><td><a href="/file?id=%d">%s</a></td><td>%s</td><td>%s</td><td>%d</td><td><a href="/download?path=%s">Download</a></td></tr>`,
			f.ID, esc(f.Name), esc(f.Visibility), humanSize(f.Size), f.Downloads, dl)
	}
	b.WriteString(`</table>`)
	b.WriteString(`<h2>Upload a file</h2><form method="post" action="/upload" enctype="multipart/form-data" class="form">` +
		`<input type="file" name="file" required>` +
		`<label>Description<input name="description" placeholder="What is this file?"></label>` +
		`<label>Visibility<select name="visibility"><option value="private">Private</option><option value="public">Public — anyone with the link</option></select></label>` +
		`<button>Upload</button></form>`)
	b.WriteString(`<h2>Import from a URL</h2><form method="post" action="/fetch" class="form">` +
		`<label>File URL<input name="url" placeholder="https://example.com/report.pdf" required></label><button>Fetch it for me</button></form>` +
		`<p class="muted">Our server downloads the file and stores it in your account.</p>`)
	render(w, r, "My Files", b.String())
}

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil || r.Method != http.MethodPost {
		return
	}
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "bad upload", http.StatusBadRequest)
		return
	}
	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "no file", http.StatusBadRequest)
		return
	}
	defer file.Close()
	name := filepath.Base(header.Filename)
	rel, size, err := writeFixture(userSlug(u.Email), name, "")
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	dst, _ := os.Create(filepath.Join(labRoot, rel))
	size, err = io.Copy(dst, file)
	_ = dst.Close()
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	vis := r.FormValue("visibility")
	if vis != "public" {
		vis = "private"
	}
	_, err = db.Exec("INSERT INTO files (owner_id,name,stored_path,description,visibility,size) VALUES (?,?,?,?,?,?)",
		u.ID, name, rel, r.FormValue("description"), vis, size)
	if err != nil {
		http.Error(w, "database error", http.StatusInternalServerError)
		return
	}
	appLog(r, "UPLOAD "+name)
	http.Redirect(w, r, "/files", http.StatusFound)
}

// fileHandler shows one file's metadata page. It loads the file by id alone —
// whose file it is never enters the query. That is the IDOR.
func fileHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil {
		return
	}
	id, _ := strconv.Atoi(r.URL.Query().Get("id"))
	f := fileByID(id)
	if f == nil {
		render(w, r, "Not Found", `<h1>File not found</h1>`)
		return
	}
	if f.OwnerID != u.ID && f.Visibility == "private" {
		pass("idor-file") // a private file's details were served to a stranger
		appLog(r, fmt.Sprintf("IDOR file #%d (%s) viewed by %s", f.ID, f.Name, u.Email))
	}
	dl := url.QueryEscape(strings.TrimPrefix(f.StoredPath, "storage/"))
	var b strings.Builder
	fmt.Fprintf(&b, `<h1>%s</h1><p>Owner: %s</p><p>%s</p><p>Visibility: <b>%s</b> · Size: %s · Downloads: %d</p>`,
		esc(f.Name), esc(f.OwnerName), esc(f.Description), esc(f.Visibility), humanSize(f.Size), f.Downloads)
	fmt.Fprintf(&b, `<p><a href="/download?path=%s">⬇ Download</a>`, dl)
	if f.Visibility == "public" {
		fmt.Fprintf(&b, ` · Public page: <a href="/p/%d">/p/%d</a>`, f.ID, f.ID)
	}
	b.WriteString(`</p>`)
	if f.OwnerID == u.ID {
		b.WriteString(`<h2>Sharing settings</h2><form method="post" action="/file/share" class="form">` +
			`<input type="hidden" name="id" value="` + strconv.Itoa(f.ID) + `">` +
			`<label>Visibility<select name="visibility"><option value="private">Private</option><option value="public">Public</option></select></label>` +
			`<button>Save sharing settings</button></form>`)
	}
	render(w, r, "File", b.String())
}

// shareHandler changes a file's visibility. There is no anti-CSRF token
// anywhere in this app — the session cookie alone authorises the POST.
func shareHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil || r.Method != http.MethodPost {
		return
	}
	id, _ := strconv.Atoi(r.FormValue("id"))
	f := fileByID(id)
	if f == nil || f.OwnerID != u.ID {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	vis := r.FormValue("visibility")
	if vis != "public" {
		vis = "private"
	}
	// detection, RS-01 style: no token field, and the request did not come
	// from a page of this app (Referer absent or a different host)
	hasToken := r.FormValue("csrf_token") != ""
	ref := r.Referer()
	refHost := ""
	if ref != "" {
		if ru, err := url.Parse(ref); err == nil {
			refHost = ru.Host
		}
	}
	if !hasToken && (ref == "" || refHost != r.Host) {
		pass("csrf-share")
		appLog(r, fmt.Sprintf("CSRF-style share change on file #%d (referer: %q)", f.ID, ref))
	}
	_, _ = db.Exec("UPDATE files SET visibility = ? WHERE id = ?", vis, id)
	appLog(r, fmt.Sprintf("SHARE file #%d -> %s", id, vis))
	http.Redirect(w, r, "/file?id="+strconv.Itoa(id), http.StatusFound)
}

/* -------------------------------- download -------------------------------- */

// downloadHandler serves a file from the storage folder. The path parameter
// is joined straight onto the folder — nothing confines it there.
func downloadHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil {
		return
	}
	rel := r.URL.Query().Get("path")
	if rel == "" {
		http.Error(w, "missing path", http.StatusBadRequest)
		return
	}
	full := filepath.Join(storageRoot(), rel) // Join cleans, but it does not confine
	info, err := os.Stat(full)
	if err != nil || info.IsDir() {
		http.NotFound(w, r)
		return
	}
	u = userByID(u.ID) // fresh counters
	if u.DownloadsUsed >= u.Quota {
		w.WriteHeader(http.StatusTooManyRequests)
		render(w, r, "Quota", `<h1>Daily download quota reached</h1><p class="muted">Free tier: `+strconv.Itoa(u.Quota)+` downloads a day. Come back tomorrow — or go Business.</p>`)
		return
	}
	used := u.DownloadsUsed
	fh, err := os.Open(full)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Disposition", "attachment; filename="+strconv.Quote(filepath.Base(full)))
	w.Header().Set("Content-Type", "application/octet-stream")
	_, _ = io.Copy(w, fh)
	_ = fh.Close()

	// accounting AFTER the serve, as a read-modify-write with the stale
	// value: no transaction, no lock, no atomic increment. Under parallel
	// load the counter falls behind the real number of downloads — the race.
	_, _ = db.Exec("UPDATE users SET downloads_used = ? WHERE id = ?", used+1, u.ID)
	_, _ = db.Exec("INSERT INTO download_log (user_id, path, at) VALUES (?,?,?)", u.ID, rel, time.Now().UTC().Format(time.RFC3339))
	abs, _ := filepath.Abs(full)
	labRel, _ := filepath.Rel(labRoot, abs)
	_, _ = db.Exec("UPDATE files SET downloads = downloads + 1 WHERE stored_path = ?", labRel)
	appLog(r, "DOWNLOAD "+rel)

	storageAbs, _ := filepath.Abs(storageRoot())
	if abs != storageAbs && !strings.HasPrefix(abs, storageAbs+string(os.PathSeparator)) {
		pass("path-traversal") // a file outside the store was actually served
		appLog(r, "TRAVERSAL served "+abs)
	}
	if rec := fileByStoredPath(labRel); rec != nil && rec.OwnerID != u.ID && rec.Visibility == "private" {
		pass("idor-file")
	}
	var cnt int
	_ = db.QueryRow("SELECT COUNT(*) FROM download_log WHERE user_id = ?", u.ID).Scan(&cnt)
	if cnt > u.Quota {
		pass("race-counter") // more downloads happened than the quota allows
		appLog(r, fmt.Sprintf("RACE quota exceeded: %d downloads on a quota of %d", cnt, u.Quota))
	}
}

/* --------------------------------- search --------------------------------- */

// searchHandler finds files by name/description. The query is built with
// fmt.Sprintf — the most natural Go idiom, and the wrong one here.
func searchHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil {
		return
	}
	q := r.URL.Query().Get("q")
	var b strings.Builder
	b.WriteString(`<h1>Search my files</h1><form method="get" class="searchbar"><input name="q" value="` + esc(q) + `" placeholder="Search names and descriptions"><button>Search</button></form>`)
	if q != "" {
		sqlQ := fmt.Sprintf("SELECT id, owner_id, name, description, visibility FROM files WHERE owner_id = %d AND name LIKE '%%%s%%' OR description LIKE '%%%s%%' ORDER BY id", u.ID, q, q)
		rows, err := db.Query(sqlQ)
		if err != nil {
			b.WriteString(`<pre class="err">Database error: ` + esc(err.Error()) + `</pre>`)
		} else {
			defer rows.Close()
			count := 0
			for rows.Next() {
				var id, ownerID int
				var name, desc, vis string
				if err := rows.Scan(&id, &ownerID, &name, &desc, &vis); err != nil {
					continue
				}
				count++
				// detection: the injected query actually changed the result
				// set — a stranger's file, or user-table data in file fields
				if ownerID != u.ID || (strings.Contains(name, "@") && strings.Contains(name, "example")) || (strings.Contains(desc, "@") && strings.Contains(desc, "example")) {
					pass("sqli")
					appLog(r, "SQLI search returned data outside the caller's files")
				}
				fmt.Fprintf(&b, `<div class="review"><b><a href="/file?id=%d">%s</a></b> <span class="muted">%s</span><p>%s</p></div>`, id, esc(name), esc(vis), esc(desc))
			}
			fmt.Fprintf(&b, `<p class="muted">%d result(s)</p>`, count)
		}
	}
	render(w, r, "Search", b.String())
}

/* ------------------------------- fetch (SSRF) ------------------------------ */

// fetchHandler imports a file from a URL. The server fetches whatever it is
// given — including addresses only the server itself can reach.
func fetchHandler(w http.ResponseWriter, r *http.Request) {
	u := requireUser(w, r)
	if u == nil || r.Method != http.MethodPost {
		return
	}
	raw := r.FormValue("url")
	parsed, err := url.Parse(raw)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		render(w, r, "Import", `<h1>Import failed</h1><p class="err">That is not an http(s) URL.</p>`)
		return
	}
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(raw)
	if err != nil {
		render(w, r, "Import", `<h1>Import failed</h1><p class="err">Could not fetch: `+esc(err.Error())+`</p>`)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if resp.StatusCode != http.StatusOK || len(body) == 0 {
		render(w, r, "Import", `<h1>Import failed</h1><p class="err">The URL answered `+esc(resp.Status)+`.</p>`)
		return
	}
	base := filepath.Base(parsed.Path)
	if base == "" || base == "." || base == "/" {
		base = "download.txt"
	}
	name := fmt.Sprintf("import-%d-%s", time.Now().Unix(), base)
	rel, size, werr := writeFixture(userSlug(u.Email), name, string(body))
	if werr != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	_, _ = db.Exec("INSERT INTO files (owner_id,name,stored_path,description,visibility,size) VALUES (?,?,?,?,'private',?)",
		u.ID, name, rel, "Imported from "+raw, size)
	appLog(r, "FETCH "+raw)
	// detection: the fetched host is an address only meaningful inside —
	// loopback, private or link-local — and content really came back
	host := parsed.Hostname()
	ip := net.ParseIP(host)
	if host == "localhost" || (ip != nil && (ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast())) {
		pass("ssrf-fetch")
		appLog(r, "SSRF fetched internal address "+raw)
	}
	http.Redirect(w, r, "/files", http.StatusFound)
}

/* ------------------------- public page (text/template) --------------------- */

// The public share page was built by a contractor as a separate mini-renderer.
// It uses text/template — which escapes nothing — instead of html/template.
var publicTmpl = texttemplate.Must(texttemplate.New("public").Parse(
	`<!DOCTYPE html><html><head><meta charset="utf-8"><title>{{.Name}} · HexaFiles public file</title>` +
		`<link rel="stylesheet" href="/assets/style.css"></head><body><main>` +
		`<h1>{{.Name}}</h1><p>{{.Description}}</p>` +
		`<p class="muted">Shared by {{.OwnerName}} · {{.Size}}</p>` +
		`<p><a href="/login">Log in</a> to download this file.</p></main></body></html>`))

func publicHandler(w http.ResponseWriter, r *http.Request) {
	id, _ := strconv.Atoi(strings.TrimPrefix(r.URL.Path, "/p/"))
	f := fileByID(id)
	if f == nil || f.Visibility != "public" {
		http.NotFound(w, r)
		return
	}
	data := map[string]string{
		"Name": f.Name, "Description": f.Description,
		"OwnerName": f.OwnerName, "Size": humanSize(f.Size),
	}
	var buf bytes.Buffer
	if err := publicTmpl.Execute(&buf, data); err != nil {
		http.Error(w, "render error", http.StatusInternalServerError)
		return
	}
	// detection: stored markup was served raw to the visitor
	if strings.Contains(f.Description, "<") && bytes.Contains(buf.Bytes(), []byte(f.Description)) {
		pass("xss-text-template")
		appLog(r, fmt.Sprintf("XSS public page of file #%d served raw markup", f.ID))
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(buf.Bytes())
}

/* ------------------------------ internal page ------------------------------ */

// metricsHandler is an internal status page meant for the ops team's
// dashboard on the office network. It answers on the public port anyway.
func metricsHandler(w http.ResponseWriter, r *http.Request) {
	var users, files int
	_ = db.QueryRow("SELECT COUNT(*) FROM users").Scan(&users)
	_ = db.QueryRow("SELECT COUNT(*) FROM files").Scan(&files)
	w.Header().Set("Content-Type", "text/plain")
	fmt.Fprintf(w, "HEXAfiles internal metrics — INTERNAL ONLY\nusers: %d\nfiles: %d\ngoroutines: %d\ngo: %s\n",
		users, files, runtime.NumGoroutine(), runtime.Version())
}
