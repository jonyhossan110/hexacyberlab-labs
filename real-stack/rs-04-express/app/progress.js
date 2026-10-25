/* Lab progress — same shape as the core HexaCyberLab labs:
   progress.json { unlocked, tests:{id:true}, attempts:{}, keyRevealed, completedAt } */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const LAB_ROOT = path.join(__dirname, '..');
const FILE = path.join(LAB_ROOT, 'progress.json');
const TOTAL = 12;
function load() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (j && typeof j === 'object') return j;
  } catch (e) { /* fresh lab */ }
  return { unlocked: true, tests: {}, attempts: {}, keyRevealed: false, completedAt: null };
}
function save(p) { fs.writeFileSync(FILE, JSON.stringify(p, null, 2)); }
function pass(id) {
  const p = load();
  if (p.tests[id]) return;
  p.tests[id] = true;
  if (Object.keys(p.tests).filter(k => p.tests[k]).length >= TOTAL && !p.completedAt) {
    p.completedAt = new Date().toISOString();
  }
  save(p);
}
function attempt(key) {
  const p = load();
  p.attempts[key] = (p.attempts[key] || 0) + 1;
  save(p);
  return p.attempts[key];
}
function doneCount() { const p = load(); return Object.keys(p.tests).filter(k => p.tests[k]).length; }
function completionCode() {
  if (doneCount() < TOTAL) return null;
  return 'RS04-' + crypto.createHash('sha256').update('rs-04-express:hexadesk').digest('hex').slice(0, 10).toUpperCase();
}
module.exports = { load, save, pass, attempt, doneCount, completionCode, TOTAL, LAB_ROOT };
