'use strict';
/* HexaCyberLab — chain verification tool.
   The 110 labs form a chain: Lab N's completion key must equal Lab N+1's entry key.
   This script checks every link WITHOUT printing any key value — it only reports
   PASS / FAIL / SKIP per link. Run after any lab edit to catch a broken chain early.

   How it works: each lab's server.js assembles its keys from in-file fragments via
   a small pure function (entryKey / completionKey / assembleEntryKey /
   assembleCompletionKey / assembleKey). The tool lifts just those pure pieces
   (string-array constants + function declarations) into a vm sandbox and calls
   them. Labs whose key code does not fit that shape are reported SKIP.

   Usage: node gateway/verify-chain.js [--from 40 --to 60]
   Exit code: 1 if any link FAILs, 0 otherwise (SKIP does not fail the run). */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const INDEX = JSON.parse(fs.readFileSync(path.join(__dirname, 'lab-index.json'), 'utf8'));
const LABS = INDEX.labs.slice().sort((a, b) => a.number - b.number);

const args = process.argv.slice(2);
function argVal(flag) { const i = args.indexOf(flag); return i >= 0 ? Number(args[i + 1]) : null; }
const FROM = argVal('--from') || 1;
const TO = argVal('--to') || LABS.length;

/* Extract a balanced chunk starting at index `start` (which points at an opening
   bracket). Returns the chunk string or null. String-aware (', ", `) with escapes. */
function balanced(src, start) {
  const open = src[start];
  const close = { '(': ')', '{': '}', '[': ']' }[open];
  if (!close) return null;
  let depth = 0, i = start, str = null, esc = false;
  while (i < src.length) {
    const c = src[i];
    if (str) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === str) str = null;
    } else if (c === "'" || c === '"' || c === '`') str = c;
    else if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return src.slice(start, i + 1); }
    i++;
  }
  return null;
}

/* Collect the pure building blocks of a lab's key code. */
function collectPieces(src) {
  const pieces = [];
  const seen = new Set();
  const emit = (name, code) => { if (!seen.has(name) && code.length < 4000) { seen.add(name); pieces.push(code); } };
  // const NAME = [ ... ];  (fragment arrays)
  for (const m of src.matchAll(/(?:^|\n)\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*\[/g)) {
    const at = src.indexOf('[', m.index + m[0].length - 1);
    const chunk = at >= 0 ? balanced(src, at) : null;
    if (chunk) emit(m[1], 'const ' + m[1] + ' = ' + chunk + ';');
  }
  // const NAME = '...';  (plain string constants sometimes used as fragments)
  for (const m of src.matchAll(/(?:^|\n)\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*;/g)) {
    emit(m[1], 'const ' + m[1] + ' = ' + m[2] + ';');
  }
  // function name(...) { ... } declarations (clean signatures only)
  for (const m of src.matchAll(/(?:^|\n)\s*function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    const braceAt = src.indexOf('{', m.index);
    if (braceAt < 0) continue;
    const head = src.slice(m.index, braceAt).trim();
    if (/[;=]/.test(head.replace(/\([^)]*\)/, ''))) continue; // not a clean signature — skip
    const chunk = balanced(src, braceAt);
    if (chunk && chunk.length < 3000) emit(m[1], head + ' ' + chunk);
  }
  // const name = (...) => { ... }  /  const name = function(...) { ... }
  for (const m of src.matchAll(/(?:^|\n)\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:function\s*)?\([^)]*\)\s*(?:=>\s*)?\{/g)) {
    const braceAt = m.index + m[0].length - 1;
    const head = src.slice(m.index, braceAt).trim();
    const chunk = balanced(src, braceAt);
    if (chunk && chunk.length < 3000) emit(m[1], head + ' ' + chunk + ';');
  }
  // const name = (...) => expression;
  for (const m of src.matchAll(/(?:^|\n)\s*const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([^;{}]+);/g)) {
    emit(m[1], m[0].trim());
  }
  return pieces;
}

function plausibleKey(v) {
  return typeof v === 'string' && v.length >= 8 && v.length <= 64 && /^[A-Za-z0-9\-_:.]+$/.test(v);
}

function extractKeys(lab) {
  const src = fs.readFileSync(path.join(ROOT, lab.relPath, 'server.js'), 'utf8');
  const ctx = vm.createContext({ Buffer, console: { log() {}, error() {}, warn() {} } });
  // Some labs guard their completion key behind runtime state (state.keyRevealed /
  // progress.keyRevealed). Stub that state as "revealed" so the pure key math runs.
  try { vm.runInContext('var state = { keyRevealed: true, unlocked: true, tests: {}, attempts: {} }; var progress = { keyRevealed: true, unlocked: true, tests: {}, attempts: {} };', ctx, { timeout: 500 }); } catch (e) { /* stubs optional */ }
  // Load pieces one by one: a piece that references lab runtime state (TESTS, db,
  // progress…) fails on its own and is discarded — the key pieces survive.
  for (const piece of collectPieces(src)) {
    try { vm.runInContext(piece, ctx, { timeout: 500 }); } catch (e) { /* discard broken piece */ }
  }
  const probe = '({ entryKey: typeof entryKey !== "undefined" ? entryKey : (typeof assembleEntryKey !== "undefined" ? assembleEntryKey : (typeof entryKeyValue !== "undefined" ? entryKeyValue : (typeof _entryKey !== "undefined" ? _entryKey : null))),' +
    ' completionKey: typeof completionKey !== "undefined" ? completionKey : (typeof assembleCompletionKey !== "undefined" ? assembleCompletionKey : (typeof completionKeyValue !== "undefined" ? completionKeyValue : (typeof rewardKey !== "undefined" ? rewardKey : (typeof _completionKey !== "undefined" ? _completionKey : null)))),' +
    ' assembleKey: typeof assembleKey !== "undefined" ? assembleKey : null,' +
    ' shardsE: typeof _eS !== "undefined" ? _eS : (typeof _E !== "undefined" ? _E : (typeof ENTRY_SHARDS !== "undefined" ? ENTRY_SHARDS : null)),' +
    ' shardsC: typeof _cS !== "undefined" ? _cS : (typeof _C !== "undefined" ? _C : (typeof COMP_SHARDS !== "undefined" ? COMP_SHARDS : null)) })';
  let fns;
  try { fns = vm.runInContext(probe, ctx, { timeout: 1500 }); } catch (e) { return { error: 'sandbox: ' + e.message.slice(0, 60) }; }
  const out = {};
  const tryCall = (fn, argList) => {
    for (const a of argList) {
      try { const v = a === undefined ? fn() : fn(a); if (plausibleKey(v)) return v; } catch (e) { /* try next shape */ }
    }
    return null;
  };
  if (fns.entryKey) out.entry = tryCall(fns.entryKey, [undefined]);
  if (fns.completionKey) out.completion = tryCall(fns.completionKey, [undefined]);
  if (fns.assembleKey && (!out.entry || !out.completion)) {
    if (!out.entry) out.entry = tryCall(fns.assembleKey, ['entry', 0, 'in', 'prev', fns.shardsE]);
    if (!out.completion) out.completion = tryCall(fns.assembleKey, ['completion', 1, 'out', 'next', fns.shardsC]);
  }
  return out;
}

let pass = 0, fail = 0, skip = 0;
const extracted = new Map();
for (const lab of LABS) {
  if (lab.number < FROM || lab.number > TO) continue;
  extracted.set(lab.number, extractKeys(lab));
}
for (let n = FROM; n < Math.min(TO, LABS.length); n++) {
  const a = extracted.get(n), b = extracted.get(n + 1);
  const la = LABS.find(l => l.number === n), lb = LABS.find(l => l.number === n + 1);
  if (!a || !b || a.error || b.error || !a.completion || !b.entry) {
    skip++;
    console.log('Lab ' + n + ' (' + la.name + ') -> Lab ' + (n + 1) + ' (' + lb.name + '): SKIP' + (a && a.error ? ' (' + a.error + ')' : (!a || !a.completion ? ' (no completion key extracted)' : ' (no entry key extracted)')));
    continue;
  }
  if (a.completion === b.entry) { pass++; console.log('Lab ' + n + ' (' + la.name + ') -> Lab ' + (n + 1) + ' (' + lb.name + '): PASS'); }
  else { fail++; console.log('Lab ' + n + ' (' + la.name + ') -> Lab ' + (n + 1) + ' (' + lb.name + '): FAIL — chain link broken'); }
}
console.log('---');
console.log('Links checked: ' + (pass + fail) + ' · PASS: ' + pass + ' · FAIL: ' + fail + ' · SKIP: ' + skip);
process.exit(fail > 0 ? 1 : 0);
