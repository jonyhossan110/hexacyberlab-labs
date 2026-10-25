package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

/* Lab progress — same shape as the core HexaCyberLab labs:
   progress.json { unlocked, tests:{id:true}, attempts:{}, keyRevealed, completedAt } */

type progress struct {
	Unlocked    bool              `json:"unlocked"`
	Tests       map[string]bool   `json:"tests"`
	Attempts    map[string]int    `json:"attempts"`
	KeyRevealed bool              `json:"keyRevealed"`
	CompletedAt *string           `json:"completedAt"`
	Report      map[string]string `json:"report,omitempty"`
}

var progMu sync.Mutex

func progressPath() string { return filepath.Join(labRoot, "progress.json") }

func loadProgress() *progress {
	p := &progress{Unlocked: true, Tests: map[string]bool{}, Attempts: map[string]int{}}
	b, err := os.ReadFile(progressPath())
	if err == nil {
		_ = json.Unmarshal(b, p)
		if p.Tests == nil {
			p.Tests = map[string]bool{}
		}
		if p.Attempts == nil {
			p.Attempts = map[string]int{}
		}
	}
	return p
}

func saveProgress(p *progress) {
	b, _ := json.MarshalIndent(p, "", "  ")
	_ = os.WriteFile(progressPath(), b, 0644)
}

// pass marks a scored test complete — only ever called at the moment the
// action the test describes has actually happened on the server.
func pass(id string) {
	progMu.Lock()
	defer progMu.Unlock()
	p := loadProgress()
	if p.Tests[id] {
		return
	}
	p.Tests[id] = true
	if len(p.Tests) >= len(testDefs) && p.CompletedAt == nil {
		now := time.Now().UTC().Format(time.RFC3339)
		p.CompletedAt = &now
	}
	saveProgress(p)
}

func attempt(key string) int {
	progMu.Lock()
	defer progMu.Unlock()
	p := loadProgress()
	p.Attempts[key]++
	saveProgress(p)
	return p.Attempts[key]
}

func doneCount() int {
	progMu.Lock()
	defer progMu.Unlock()
	return len(loadProgress().Tests)
}

func testPassed(id string) bool {
	progMu.Lock()
	defer progMu.Unlock()
	return loadProgress().Tests[id]
}

// completionCode is shown on the Complete page at 100%:
// "RS10-" + the first 10 hex chars (upper-cased) of sha256("rs-10-go:hexafiles").
func completionCode() string {
	if doneCount() < len(testDefs) {
		return ""
	}
	sum := sha256.Sum256([]byte("rs-10-go:hexafiles"))
	return "RS10-" + strings.ToUpper(hex.EncodeToString(sum[:])[:10])
}
