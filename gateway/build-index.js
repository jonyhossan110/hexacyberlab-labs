'use strict';
// Builds gateway/lab-index.json by scanning every lab folder in the repo.
// Run: node gateway/build-index.js
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');

const CLASS_RULES = [
  ['sqli', /sql injection|sqli/i],
  ['idor', /idor|insecure direct object|broken access|access control|ownership|object reference/i],
  ['xss', /xss|cross-site scripting|cross site scripting/i],
  ['csrf', /csrf|cross-site request|cross site request/i],
  ['ssrf', /ssrf|server-side request|server side request/i],
  ['xxe', /xxe|xml external/i],
  ['file-upload', /file upload|upload bypass|unrestricted upload/i],
  ['path-traversal', /path traversal|directory traversal|traversal/i],
  ['jwt', /jwt|json web token|token forgery|token tamper|predictable token|api token/i],
  ['brute-force', /brute force|credential stuffing|rate limit|no lockout|lockout/i],
  ['password-storage', /weak hash|md5|password storage|unsalted|plain.?text password/i],
  ['default-credentials', /default credential|default password|default admin/i],
  ['mass-assignment', /mass assignment|over-posting|parameter binding/i],
  ['api-exposure', /data exposure|excessive data|sensitive data|information disclosure|verbose error|debug endpoint|data leak/i],
  ['race-condition', /race condition|double spend|concurren/i],
  ['business-logic', /price tamper|price manipulation|business logic|coupon abuse|discount abuse|negative|workflow bypass|limit bypass|refund abuse|balance manipul/i],
  ['prompt-injection', /prompt injection|llm|ai chatbot|jailbreak|model manipulation/i],
  ['rce-injection', /command injection|remote code execution|\brce\b|code execution|ssti|server-side template|deserialization|object injection/i],
  ['open-redirect', /open redirect/i],
  ['misconfiguration', /misconfig|cors|security header|clickjack|open redirect|directory listing|backup file/i],
  ['auth-bypass', /authentication|auth bypass|session|login bypass|password reset|enumeration|2fa|otp|verification code/i],
  ['graphql', /graphql/i],
];
function classify(name) {
  for (const [key, re] of CLASS_RULES) if (re.test(name)) return key;
  return 'general';
}
function grab(src, re) { const m = src.match(re); return m ? m[1] : null; }

const cats = fs.readdirSync(ROOT).filter(d => /^\d{2}-/.test(d) && fs.statSync(path.join(ROOT, d)).isDirectory()).sort();
const labs = [];
for (const cat of cats) {
  const catDir = path.join(ROOT, cat);
  for (const dir of fs.readdirSync(catDir).sort()) {
    const labDir = path.join(catDir, dir);
    const sj = path.join(labDir, 'server.js');
    if (!fs.existsSync(sj)) continue;
    const src = fs.readFileSync(sj, 'utf8');
    const num = grab(src, /LAB_NUMBER\s*=\s*(\d+)/) || grab(src, /LAB (\d+)/);
    const name = grab(src, /LAB_NAME\s*=\s*'([^']+)'/) || grab(src, /LAB_NAME\s*=\s*"([^"]+)"/) || dir;
    let port = grab(src, /const PORT = process\.env\.PORT \? parseInt\(process\.env\.PORT, 10\) : (\d+)/) || grab(src, /const PORT\s*=\s*(\d+)/) || grab(src, /process\.env\.PORT \|\| (\d+)/) || grab(src, /Number\(process\.env\.PORT\) \|\| (\d+)/) || grab(src, /port:\s*(\d+)/);
    const tests = [];
    let m;
    const tIdx = src.indexOf('const TESTS');
    const tEnd = tIdx >= 0 ? src.indexOf('\n];', tIdx) : -1;
    const tBlock = tIdx >= 0 ? src.slice(tIdx, tEnd > tIdx ? tEnd + 3 : undefined) : src;
    const reObj = /\{\s*id:\s*'((?:[^'\\]|\\.)+)'[^}]*?name:\s*(?:'((?:[^'\\]|\\.)+)'|"((?:[^"\\]|\\.)+)")/g;
    while ((m = reObj.exec(src))) { const nm = m[2] || m[3]; tests.push({ id: m[1], name: nm, cls: classify(nm) }); }
    if (!tests.length) {
      const reJson = /"id":\s*"([^"]+)"[\s\S]{0,300}?"name":\s*"([^"]+)"/g;
      while ((m = reJson.exec(src))) tests.push({ id: m[1], name: m[2], cls: classify(m[2]) });
    }
    if (!tests.length) {
      const reT = /\bT\('([^']+)',\s*'[^']+',\s*'([^']+)'/g;
      while ((m = reT.exec(src))) tests.push({ id: m[1], name: m[2], cls: classify(m[2]) });
    }
    const classes = [...new Set(tests.map(t => t.cls))];
    // Difficulty mix + estimated completion time (guided pace: Beginner ~5 min, Intermediate ~10, Advanced ~18 per test).
    const diffDist = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    let dm; const reDiff = /difficulty["']?\s*:\s*["'](Beginner|Intermediate|Advanced)["']/g;
    while ((dm = reDiff.exec(src))) diffDist[dm[1]]++;
    const dTotal = diffDist.Beginner + diffDist.Intermediate + diffDist.Advanced;
    const estMinutes = dTotal ? Math.max(10, Math.round((diffDist.Beginner * 5 + diffDist.Intermediate * 10 + diffDist.Advanced * 18) / 5) * 5) : tests.length * 12;
    const hardScore = dTotal ? (diffDist.Intermediate + 2 * diffDist.Advanced) / dTotal : 0;
    const difficulty = !dTotal ? 'Mixed' : (diffDist.Beginner / dTotal >= 0.6 ? 'Beginner' : (hardScore >= 0.58 ? 'Advanced' : 'Intermediate'));
    labs.push({
      number: num ? parseInt(num, 10) : null,
      name, dir, category: cat,
      relPath: cat + '/' + dir,
      port: port ? parseInt(port, 10) : null,
      testCount: tests.length, tests, classes,
      estMinutes, difficulty, diffDist,
    });
  }
}
labs.sort((a, b) => (a.number || 999) - (b.number || 999));
fs.writeFileSync(path.join(__dirname, 'lab-index.json'), JSON.stringify({ generated: new Date().toISOString(), labs }, null, 1));
const noPort = labs.filter(l => !l.port), noTests = labs.filter(l => !l.testCount);
console.log('labs:', labs.length, '| missing port:', noPort.length, noPort.map(l => l.relPath).join(','));
console.log('missing tests:', noTests.length, noTests.map(l => l.relPath).join(','));
console.log('total tests:', labs.reduce((s, l) => s + l.testCount, 0));
