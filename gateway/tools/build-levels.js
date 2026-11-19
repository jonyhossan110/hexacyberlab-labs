'use strict';
/* HexaCyberLab — lab level engine.
   Run: node gateway/tools/build-levels.js

   What it does (reproducible — rerun any time the index changes):
   1. Scores every TEST in gateway/lab-index.json with the rubric below.
   2. Ranks all 110 labs by difficulty and assigns each lab a level
      (1 Beginner · 2 Intermediate · 3 Advanced · 4 Elite) by QUARTILE of
      that ranking — see "Lab levels" below.
   3. Rewrites the ORDER of labs inside gateway/lab-index.json: categories keep
      their order; within a category, labs are sorted by (level, then mean
      score), easiest first, keeping the previous relative order on ties.
      This array order is the dashboard's display order, so the dashboard
      becomes a step-by-step path.
   4. Writes gateway/levels.json, keyed by lab PORT:
      { level, levelName, score, categoryStep, learn } — score is the lab's
      mean test score (2dp), kept in the file so the basis of every level is
      transparent; categoryStep is the lab's 1-based step inside its category
      in the new order; learn lists up to 3 plain-language topics from the
      lab's most frequent test classes. categoryStep is computed here, from
      the final index order this script writes, so levels.json and
      lab-index.json can never drift apart.

   What it deliberately does NOT touch:
   - Ports. A lab's port is its address everywhere; it never changes.
   - The `number` field. A lab's number is bound to the LAB_NUMBER constant in
     its own server.js, to the certificate it prints, and to the unlock key
     chain (Lab N's completion key opens Lab N+1 — see gateway/verify-chain.js).
     Renumbering here would desync all three, so the learning order is carried
     by the array order + categoryStep instead. Renumbering safely would need a
     dedicated re-chain pass over every lab file.
   - Any test, route or lab file. Levels are metadata only.

   Rubric — base score by test class (cls), then keyword overrides on the
   test name (case-insensitive), applied in rising-severity order so the
   strongest signal wins:
     base: default-credentials 1 · misconfiguration 1 · brute-force 1 ·
           auth-bypass 1 · open-redirect 1 · general 2 · xss 2 · sqli 2 ·
           csrf 2 · idor 2 · api-exposure 2 · business-logic 3 ·
           mass-assignment 3 · jwt 3 · file-upload 3 · path-traversal 3 ·
           ssrf 3 · race-condition 4 · rce-injection 4
           (classes the rubric does not name, present in the index:
            password-storage 2 · prompt-injection 2 · graphql 3 · xxe 3 ·
            anything unknown 2)
     keywords: "verbose"/"disclosure" → 1 · sqli "login bypass" → 1 ·
           xss "reflected" → 1 · "union" → 2 · xss "stored" → 2 ·
           idor "cross-tenant"/"another company" → 3 · "blind"/"time-based" → 4 ·
           "second-order" → 4 · "chain" → 4 ·
           whole-word "admin" (the flaw reaches an admin surface) → +1 tier,
           capped at 4 — except default-credentials, whose class score already
           IS the "default admin password" idea.

   Lab levels — RELATIVE (quartile), not absolute thresholds:
   Every lab in this programme was built as a full ladder in itself — its
   tests span basic to advanced — so lab mean scores cluster tightly
   (roughly 1.84–2.24). The first version of this script used fixed mean
   thresholds (< 1.6 / < 2.4 / < 3.2) and collapsed: 109 of 110 labs landed
   on Intermediate and the 4-level path was useless. Levels are therefore
   assigned relative to this programme's own 110 labs:
     - Per lab compute: mean test score, hardShare (% of tests scoring >= 3),
       and maxTier (its hardest test's score).
     - Rank all labs by (mean asc, hardShare asc, maxTier asc, name asc) —
       the programme difficulty ranking, easiest first.
     - Quartiles of the ranking: ranks 1–28 Beginner(1) · 29–55
       Intermediate(2) · 56–83 Advanced(3) · 84–110 Elite(4).
   A level thus means "this lab sits in the easiest / second / third /
   hardest quarter of THIS programme" — exactly what a step-by-step path
   needs. If labs are added or re-scored, rerunning this script rebalances
   the quartiles.
   Level 4 is named "Elite", not "Expert": expert is what a tester becomes
   after real-world experience — a lab tier does not carry that title. */
const fs = require('node:fs');
const path = require('node:path');

const GW = path.join(__dirname, '..');
const INDEX_PATH = path.join(GW, 'lab-index.json');
const LEVELS_PATH = path.join(GW, 'levels.json');

const BASE = {
  'default-credentials': 1, 'misconfiguration': 1, 'brute-force': 1, 'auth-bypass': 1,
  'open-redirect': 1,
  'general': 2, 'xss': 2, 'sqli': 2, 'csrf': 2, 'idor': 2, 'api-exposure': 2,
  'business-logic': 3, 'mass-assignment': 3, 'jwt': 3, 'file-upload': 3,
  'path-traversal': 3, 'ssrf': 3,
  'race-condition': 4, 'rce-injection': 4,
  'password-storage': 2, 'prompt-injection': 2, 'graphql': 3, 'xxe': 3,
};
function scoreTest(t) {
  const name = String(t.name || '').toLowerCase();
  let s = BASE[t.cls] != null ? BASE[t.cls] : 2;
  if (/verbose|disclosure/.test(name)) s = 1;
  if (t.cls === 'sqli' && name.includes('login bypass')) s = 1;
  if (t.cls === 'xss' && name.includes('reflected')) s = 1;
  if (name.includes('union')) s = 2;
  if (t.cls === 'xss' && name.includes('stored')) s = 2;
  if (t.cls === 'idor' && (name.includes('cross-tenant') || name.includes('another company'))) s = 3;
  if (/blind|time-based/.test(name)) s = 4;
  if (name.includes('second-order')) s = 4;
  if (name.includes('chain')) s = 4;
  if (/\badmin\b/.test(name) && t.cls !== 'default-credentials') s = Math.min(4, s + 1);
  return s;
}

const LEARN = {
  'sqli': 'SQL injection', 'xss': 'Cross-site scripting (XSS)', 'idor': 'Access control & IDOR',
  'csrf': 'CSRF', 'business-logic': 'Business logic flaws', 'ssrf': 'Server-side request forgery',
  'jwt': 'Token & session flaws', 'file-upload': 'File upload flaws', 'path-traversal': 'Path traversal',
  'api-exposure': 'Data exposure', 'auth-bypass': 'Login & account flaws',
  'default-credentials': 'Default credentials', 'brute-force': 'Brute force',
  'misconfiguration': 'Security misconfiguration', 'mass-assignment': 'Mass assignment',
  'race-condition': 'Race conditions', 'rce-injection': 'Command injection',
  'open-redirect': 'Open redirects', 'general': 'Core web flaws',
  'password-storage': 'Password storage flaws', 'prompt-injection': 'Prompt injection',
  'graphql': 'GraphQL flaws', 'xxe': 'XML external entity (XXE)',
};
const LEVEL_NAMES = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced', 4: 'Elite' };
// Quartile boundaries over the 110-lab difficulty ranking (1-based ranks):
// 1–28 Beginner · 29–55 Intermediate · 56–83 Advanced · 84–110 Elite.
function levelForRank(rank) { return rank <= 28 ? 1 : rank <= 55 ? 2 : rank <= 83 ? 3 : 4; }

function labStats(lab) {
  const scores = lab.tests.map(scoreTest);
  const n = scores.length || 1;
  const mean = scores.reduce((a, b) => a + b, 0) / n;
  const hardShare = scores.filter(x => x >= 3).length / n;
  const maxTier = scores.length ? Math.max(...scores) : 0;
  return { mean, hardShare, maxTier, scores };
}
function learnTopics(lab) {
  const freq = new Map();
  for (const t of lab.tests) freq.set(t.cls, (freq.get(t.cls) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([cls]) => LEARN[cls] || 'Core web flaws');
}

function build() {
  const index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  const labs = index.labs;
  const stats = new Map();
  for (const lab of labs) stats.set(lab.port, labStats(lab));

  // Programme difficulty ranking: easiest first. The name key makes the
  // ranking fully deterministic even when every score ties.
  const ranking = [...labs].sort((a, b) => {
    const sa = stats.get(a.port), sb = stats.get(b.port);
    return (sa.mean - sb.mean) || (sa.hardShare - sb.hardShare) ||
           (sa.maxTier - sb.maxTier) || String(a.name).localeCompare(String(b.name));
  });
  const levelOf = new Map();
  ranking.forEach((lab, i) => levelOf.set(lab.port, levelForRank(i + 1)));

  // Sort within each category by (level asc, mean asc) — Array.sort is stable
  // in Node, so full ties keep their previous relative order.
  const cats = [...new Set(labs.map(l => l.category))];
  const reordered = [];
  for (const cat of cats) {
    const inCat = labs.filter(l => l.category === cat);
    inCat.sort((a, b) => (levelOf.get(a.port) - levelOf.get(b.port)) ||
                         (stats.get(a.port).mean - stats.get(b.port).mean));
    reordered.push(...inCat);
  }

  const levels = {};
  const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const cat of cats) {
    const inCat = reordered.filter(l => l.category === cat);
    inCat.forEach((lab, i) => {
      const lv = levelOf.get(lab.port);
      dist[lv]++;
      levels[lab.port] = {
        level: lv,
        levelName: LEVEL_NAMES[lv],
        score: Math.round(stats.get(lab.port).mean * 100) / 100,
        categoryStep: i + 1,
        learn: learnTopics(lab),
      };
    });
  }

  index.labs = reordered;
  fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 1));
  // levels.json IS the port-keyed map: { "<port>": { level, levelName, score, categoryStep, learn } }
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 1));

  console.log('labs:', reordered.length);
  console.log('level distribution:', [1, 2, 3, 4].map(lv => LEVEL_NAMES[lv] + ' ' + dist[lv]).join(' · '));
  console.log('ranking span: easiest', ranking[0].name, stats.get(ranking[0].port).mean.toFixed(2),
              '→ hardest', ranking[ranking.length - 1].name, stats.get(ranking[ranking.length - 1].port).mean.toFixed(2));
  console.log('wrote', path.relative(process.cwd(), LEVELS_PATH), 'and reordered', path.relative(process.cwd(), INDEX_PATH));
  return { dist, levels, ranking, stats };
}

if (require.main === module) build();
module.exports = { scoreTest, labStats, learnTopics, LEVEL_NAMES, levelForRank, build };
