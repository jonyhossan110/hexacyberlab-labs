package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite" // pure-Go SQLite driver — no cgo, like a real single-binary Go service
)

/* Storage layer. Metadata lives in SQLite (data.sqlite at the lab root);
   file bytes live on disk under storage/<user-slug>/, exactly the way the
   original two-person team built it in 2023. */

var db *sql.DB

type User struct {
	ID            int
	Name          string
	Email         string
	Password      string // stored in plaintext — noted in the Code Review
	Role          string
	Quota         int
	DownloadsUsed int
}

type FileRec struct {
	ID          int
	OwnerID     int
	OwnerName   string
	Name        string
	StoredPath  string // relative to the lab root, e.g. storage/lars.pettersen/notes.txt
	Description string
	Visibility  string // "private" | "public"
	Size        int64
	Downloads   int
}

func storageRoot() string { return filepath.Join(labRoot, "storage") }

func userSlug(email string) string {
	return strings.Split(email, "@")[0]
}

func openDB() error {
	dsn := "file:" + filepath.Join(labRoot, "data.sqlite") + "?_pragma=busy_timeout(5000)"
	var err error
	db, err = sql.Open("sqlite", dsn)
	if err != nil {
		return err
	}
	db.SetMaxOpenConns(1) // SQLite + a small team app: one writer at a time
	if err = db.Ping(); err != nil {
		return err
	}
	_, err = db.Exec(`
	CREATE TABLE IF NOT EXISTS users (
		id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT,
		role TEXT, quota INTEGER DEFAULT 5, downloads_used INTEGER DEFAULT 0);
	CREATE TABLE IF NOT EXISTS files (
		id INTEGER PRIMARY KEY, owner_id INTEGER, name TEXT, stored_path TEXT,
		description TEXT, visibility TEXT, size INTEGER, downloads INTEGER DEFAULT 0);
	CREATE TABLE IF NOT EXISTS download_log (
		id INTEGER PRIMARY KEY, user_id INTEGER, path TEXT, at TEXT);`)
	if err != nil {
		return err
	}
	var n int
	if err := db.QueryRow("SELECT COUNT(*) FROM users").Scan(&n); err != nil {
		return err
	}
	if n == 0 {
		return seed()
	}
	return nil
}

func writeFixture(slug, name, content string) (string, int64, error) {
	dir := filepath.Join(storageRoot(), slug)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", 0, err
	}
	p := filepath.Join(dir, name)
	if err := os.WriteFile(p, []byte(content), 0644); err != nil {
		return "", 0, err
	}
	return filepath.Join("storage", slug, name), int64(len(content)), nil
}

func seed() error {
	users := []User{
		{Name: "Sara Lindqvist", Email: "sara.lindqvist@hexafiles.example", Password: "Harbor!Admin31", Role: "admin", Quota: 50},
		{Name: "Jonas Weber", Email: "jonas.weber@example.de", Password: "Waldweg#9", Role: "customer"},
		{Name: "Amelia Hart", Email: "amelia.hart@example.co.uk", Password: "Teatime!42", Role: "customer"},
		{Name: "Sofia Rossi", Email: "sofia.rossi@example.it", Password: "Venezia!7", Role: "customer"},
		{Name: "Mikkel Lund", Email: "mikkel.lund@example.dk", Password: "Hygge#2024", Role: "customer"},
		{Name: "Emma Novak", Email: "emma.novak@example.cz", Password: "Praha!sun5", Role: "customer"},
		{Name: "Lars Pettersen", Email: "lars.pettersen@example.no", Password: "Sommer2023!", Role: "customer"},
		{Name: "Aisha Rahman", Email: "aisha.rahman@example.se", Password: "Nordlys!6", Role: "customer"},
	}
	for _, u := range users {
		q := u.Quota
		if q == 0 {
			q = 5
		}
		if _, err := db.Exec("INSERT INTO users (name,email,password,role,quota) VALUES (?,?,?,?,?)",
			u.Name, u.Email, u.Password, u.Role, q); err != nil {
			return err
		}
	}
	type seedFile struct {
		ownerEmail, name, desc, vis, content string
	}
	big := strings.Repeat("Offsite transcript line — Mikkel: the fjord route is confirmed for day two, kayaks at nine, lunch at the red boathouse.\n", 9000) // ≈1 MB of very realistic transcript
	files := []seedFile{
		{"sara.lindqvist@hexafiles.example", "incident-response-runbook.txt", "What to do in the first hour when a customer reports a breach. Internal only.", "private",
			"HEXAfiles incident runbook\n1. Freeze the affected workspace.\n2. Call Sara, then the on-call engineer.\n3. Never delete logs — Legal needs them.\n"},
		{"sara.lindqvist@hexafiles.example", "pricing-2026-draft.txt", "Draft pricing for next year. Do not share outside the company.", "private",
			"Draft 2026 pricing\nStarter 9 EUR, Team 29 EUR, Business 79 EUR per seat/month.\nEnterprise: talk to Sara.\n"},
		{"lars.pettersen@example.no", "cabin-photos-index.txt", "Index of the photos from the Geilo cabin trip, winter 2025.", "private",
			"IMG_2041.jpg - the fjord at dawn\nIMG_2044.jpg - sauna, before the jump\nIMG_2051.jpg - northern lights over the cabin roof\n"},
		{"lars.pettersen@example.no", "moving-checklist.txt", "Our Bergen to Oslo moving checklist — public, friends keep asking for it.", "public",
			"Moving checklist\n- Book the van 3 weeks ahead\n- Redirect the post\n- Water the plants one last time\n- Return the cabin key to Freya\n"},
		{"amelia.hart@example.co.uk", "board-report-q3.txt", "Quarterly summary prepared for the board. Confidential until published.", "private",
			"Q3 board summary\nRevenue up 14 percent. Churn down. Two enterprise pilots signed.\nFull numbers live in the finance folder.\n"},
		{"mikkel.lund@example.dk", "offsite-transcript.txt", "Full transcript of the team offsite planning call. Long file — the whole afternoon.", "public", big},
		{"mikkel.lund@example.dk", "kayak-routes.txt", "The Sognefjord kayak routes we recommend to everyone.", "public",
			"Route 1: Flam to Gudvangen, 17 km, calm water.\nRoute 2: Aurland loop, 9 km, good for beginners.\nAlways check the wind before 10:00.\n"},
		{"sofia.rossi@example.it", "nonna-recipes.txt", "My grandmother's recipes, typed up for the family. Public — good food should travel.", "public",
			"Nonna's ragu\nOnion, carrot, celery, patience. Four hours minimum.\nThe secret is a glass of milk at the end.\n"},
		{"emma.novak@example.cz", "thesis-notes.txt", "Notes for my masters thesis on archival storage. Private draft.", "private",
			"Thesis notes, chapter 3\nCold storage tiers compared: tape vs optical vs HDD.\nInterview with the national archive is on Thursday.\n"},
	}
	for _, f := range files {
		var ownerID int
		if err := db.QueryRow("SELECT id FROM users WHERE email = ?", f.ownerEmail).Scan(&ownerID); err != nil {
			return err
		}
		rel, size, err := writeFixture(userSlug(f.ownerEmail), f.name, f.content)
		if err != nil {
			return err
		}
		if _, err := db.Exec("INSERT INTO files (owner_id,name,stored_path,description,visibility,size) VALUES (?,?,?,?,?,?)",
			ownerID, f.name, rel, f.desc, f.vis, size); err != nil {
			return err
		}
	}
	return nil
}

func userByID(id int) *User {
	u := &User{}
	err := db.QueryRow("SELECT id,name,email,password,role,quota,downloads_used FROM users WHERE id = ?", id).
		Scan(&u.ID, &u.Name, &u.Email, &u.Password, &u.Role, &u.Quota, &u.DownloadsUsed)
	if err != nil {
		return nil
	}
	return u
}

func userByEmail(email string) *User {
	var id int
	if err := db.QueryRow("SELECT id FROM users WHERE email = ?", email).Scan(&id); err != nil {
		return nil
	}
	return userByID(id)
}

func fileByID(id int) *FileRec {
	f := &FileRec{}
	err := db.QueryRow(`SELECT f.id, f.owner_id, u.name, f.name, f.stored_path, f.description, f.visibility, f.size, f.downloads
		FROM files f JOIN users u ON u.id = f.owner_id WHERE f.id = ?`, id).
		Scan(&f.ID, &f.OwnerID, &f.OwnerName, &f.Name, &f.StoredPath, &f.Description, &f.Visibility, &f.Size, &f.Downloads)
	if err != nil {
		return nil
	}
	return f
}

func fileByStoredPath(rel string) *FileRec {
	var id int
	if err := db.QueryRow("SELECT id FROM files WHERE stored_path = ?", rel).Scan(&id); err != nil {
		return nil
	}
	return fileByID(id)
}

func listFiles(ownerID int) []FileRec {
	rows, err := db.Query(`SELECT f.id, f.owner_id, u.name, f.name, f.stored_path, f.description, f.visibility, f.size, f.downloads
		FROM files f JOIN users u ON u.id = f.owner_id WHERE f.owner_id = ? ORDER BY f.id`, ownerID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []FileRec
	for rows.Next() {
		var f FileRec
		if err := rows.Scan(&f.ID, &f.OwnerID, &f.OwnerName, &f.Name, &f.StoredPath, &f.Description, &f.Visibility, &f.Size, &f.Downloads); err == nil {
			out = append(out, f)
		}
	}
	return out
}

func publicFiles() []FileRec {
	rows, err := db.Query(`SELECT f.id, f.owner_id, u.name, f.name, f.stored_path, f.description, f.visibility, f.size, f.downloads
		FROM files f JOIN users u ON u.id = f.owner_id WHERE f.visibility = 'public' ORDER BY f.id`)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var out []FileRec
	for rows.Next() {
		var f FileRec
		if err := rows.Scan(&f.ID, &f.OwnerID, &f.OwnerName, &f.Name, &f.StoredPath, &f.Description, &f.Visibility, &f.Size, &f.Downloads); err == nil {
			out = append(out, f)
		}
	}
	return out
}

func humanSize(n int64) string {
	if n > 1024*1024 {
		return fmt.Sprintf("%.1f MB", float64(n)/(1024*1024))
	}
	if n > 1024 {
		return fmt.Sprintf("%.1f KB", float64(n)/1024)
	}
	return fmt.Sprintf("%d B", n)
}
