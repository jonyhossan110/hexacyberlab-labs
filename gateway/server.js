'use strict';
/* HexaCyberLab Gateway — one command runs the whole 110-lab programme.
   node gateway/server.js  →  http://localhost:4000
   Dashboard (status/port/progress for all 110 labs) · start/stop labs ·
   live server console (every request, every passed test) · Hexa Workbench
   (Burp-lite request builder + per-lab mission hints) ·
   unlockable Business Skills · real-world case studies.
   Local only: binds 127.0.0.1. Never expose this port to a network. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const PORT = 4000;
const PRELOAD = path.join(__dirname, 'hexa-preload.js');
const INDEX = JSON.parse(fs.readFileSync(path.join(__dirname, 'lab-index.json'), 'utf8'));
const LABS = INDEX.labs;
const byPort = new Map(LABS.map(l => [l.port, l]));
/* Real Stack track: 11 milestone labs in real stacks (PHP/Python/Express/Go),
   loaded additively — the core 110 are untouched. See gateway/real-stack-index.json. */
let RS_LABS = [];
try {
  const rsIdx = JSON.parse(fs.readFileSync(path.join(__dirname, 'real-stack-index.json'), 'utf8'));
  RS_LABS = (rsIdx.labs || []).map(e => ({ ...e, rs: true, category: 'real-stack' }));
  for (const l of RS_LABS) byPort.set(l.port, l);
} catch (e) { RS_LABS = []; }
const ALL_LABS = LABS.concat(RS_LABS);
function probeRuntime(cmds, args){
  for (const c of cmds) { try { const r = spawnSync(c, args, { timeout: 5000 }); if (!r.error) return true; } catch (e) {} }
  return false;
}
const RUNTIMES = {
  php: probeRuntime(['php'], ['--version']),
  python3: probeRuntime(['python3', 'python'], ['--version']),
  go: probeRuntime(['go'], ['version']),
  node: true,
};
function runtimeOk(lab){ return !lab.runtime || RUNTIMES[lab.runtime] !== false; }
const STATE_FILE = path.join(__dirname, 'gateway-state.json');
function readState(){ try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch (e) { return {}; } }
function writeState(patch){ const s = { ...readState(), ...patch }; try { fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 1)); } catch (e) {} return s; }
/* Progress integrity (matches hexa-preload.js): after the gateway itself writes a
   lab's progress.json (progress import), sign it so the lab's integrity check
   accepts it. Secret is per-install, kept in gateway/.progress-secret. */
function signProgressFile(labDir){
  try {
    const secretFile = path.join(__dirname, '.progress-secret');
    let secret = '';
    try { secret = fs.readFileSync(secretFile, 'utf8').trim(); } catch (e) {}
    if (!secret || secret.length < 32) { secret = crypto.randomBytes(32).toString('hex'); try { fs.writeFileSync(secretFile, secret, { mode: 0o600 }); } catch (e) {} }
    const data = fs.readFileSync(path.join(labDir, 'progress.json'));
    fs.writeFileSync(path.join(labDir, 'progress.json.sig'), crypto.createHmac('sha256', secret).update(data).digest('hex'));
  } catch (e) { /* signing is best-effort; the lab guard explains failures */ }
}
const children = new Map(); // port -> {proc, lines:[], clients:Set}

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function labDir(lab){ return path.join(ROOT, lab.relPath); }
function readProgress(lab){
  for (const f of ['progress.json','state.json']) {
    try { const j = JSON.parse(fs.readFileSync(path.join(labDir(lab), f), 'utf8')); if (j && j.tests) return j; } catch(e) {}
  }
  return null;
}
function progressOf(lab){
  const pr = readProgress(lab);
  if (!pr) return { done: 0, total: lab.testCount, pct: 0, complete: false, status: 'Locked', statusColor: '#9AA3B8' };
  const done = Object.values(pr.tests).filter(Boolean).length;
  const total = lab.testCount || done;
  const complete = !!pr.completedAt || (total > 0 && done >= total);
  const status = complete ? 'Completed' : ((pr.unlocked || done > 0) ? 'In progress' : 'Locked');
  const statusColor = complete ? '#3FB68B' : (status === 'In progress' ? '#7C6CF0' : '#9AA3B8');
  return { done, total, pct: total ? Math.floor(done/total*100) : 0, complete, status, statusColor };
}
function isRunning(port){ const c = children.get(port); return !!(c && c.proc && !c.proc.killed && c.proc.exitCode === null); }
function fmtEst(min){ if (!min) return ''; const h = Math.floor(min / 60), m = min % 60; return h ? ('~' + h + 'h ' + (m ? m + 'm' : '').trim()).trim() : ('~' + m + 'm'); }
function pushLine(port, line){
  const c = children.get(port); if (!c) return;
  const tagged = '[' + (byPort.get(port) ? byPort.get(port).name : port) + '] ' + line;
  c.lines.push(tagged); if (c.lines.length > 400) c.lines.shift();
  for (const res of c.clients) { try { res.write('data: ' + JSON.stringify(tagged) + '\n\n'); } catch(e) {} }
  console.log(tagged);
}
function startLab(lab){
  if (isRunning(lab.port)) return { ok: true, already: true };
  if (lab.rs && lab.start) {
    if (!runtimeOk(lab)) return { ok: false, error: 'runtime missing: ' + lab.runtime + ' is not installed on this machine (see the lab README for setup)' };
    const proc = spawn(lab.start.cmd, lab.start.args, {
      cwd: labDir(lab), env: { ...process.env, PORT: String(lab.port), HEXA_GATEWAY: 'http://localhost:' + PORT },
      windowsHide: true, shell: !!lab.start.shell,
    });
    children.set(lab.port, { proc, lines: [], clients: new Set() });
    pushLine(lab.port, '— starting ' + lab.number + ' ' + lab.name + ' (' + lab.stack + ') on http://localhost:' + lab.port + ' —');
    proc.stdout.on('data', d => String(d).split(/\r?\n/).filter(Boolean).forEach(l => pushLine(lab.port, l)));
    proc.stderr.on('data', d => String(d).split(/\r?\n/).filter(Boolean).forEach(l => pushLine(lab.port, '⚠ ' + l)));
    proc.on('error', e => pushLine(lab.port, '⚠ failed to start: ' + e.message));
    proc.on('exit', code => { pushLine(lab.port, '— ' + lab.number + ' stopped (exit ' + code + ') —'); });
    return { ok: true };
  }
  const meta = JSON.stringify({ number: lab.number, name: lab.name, port: lab.port, classes: lab.classes, tests: lab.tests });
  const proc = spawn(process.execPath, ['-r', PRELOAD, 'server.js'], {
    cwd: labDir(lab), env: { ...process.env, HEXA_LAB: meta, HEXA_GATEWAY: 'http://localhost:' + PORT },
    windowsHide: true,
  });
  children.set(lab.port, { proc, lines: [], clients: new Set() });
  pushLine(lab.port, '— starting LAB ' + lab.number + ' ' + lab.name + ' on http://localhost:' + lab.port + ' —');
  proc.stdout.on('data', d => String(d).split(/\r?\n/).filter(Boolean).forEach(l => pushLine(lab.port, l)));
  proc.stderr.on('data', d => String(d).split(/\r?\n/).filter(Boolean).forEach(l => pushLine(lab.port, '⚠ ' + l)));
  proc.on('exit', code => { pushLine(lab.port, '— LAB ' + lab.number + ' stopped (exit ' + code + ') —'); });
  return { ok: true };
}
function stopLab(lab){
  const c = children.get(lab.port);
  if (c && c.proc) { try { c.proc.kill(); } catch(e) {} return { ok: true }; }
  return { ok: false, error: 'not running under the gateway' };
}

/* ---------------- Hexa Workbench (Burp-lite) + missions ----------------
   The Workbench replaces the old shell-in-a-tab: web testing is HTTP, so the
   gateway now offers a request builder/repeater that can ONLY talk to lab
   servers (host must be localhost/127.0.0.1 AND the port must be a lab port
   from the programme index — anything else is rejected), a shared request
   history, a client-side decoder panel, and a per-lab Mission panel fed by
   gateway/hints.json (objective + free hint cards + collapsed solution). */
let HINTS = {};
try { HINTS = JSON.parse(fs.readFileSync(path.join(__dirname, 'hints.json'), 'utf8')); } catch (e) { HINTS = {}; }
const LAB_PORTS = new Set(ALL_LABS.map(l => l.port));
const wbHistory = []; // newest first, max 100: {time, labPort, method, url, status, reqHeaders, reqBody}
function wbParseHeaders(h){
  const out = {};
  if (!h) return out;
  if (typeof h === 'object') { for (const k of Object.keys(h)) out[k] = String(h[k]); return out; }
  for (const line of String(h).split(/\r?\n/)) {
    const i = line.indexOf(':');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}
function wbSend(opts){
  return new Promise((resolve) => {
    let url;
    try { url = new URL(String(opts.url || '')); } catch (e) { return resolve({ error: 'invalid URL' }); }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return resolve({ error: 'only http/https URLs are allowed' });
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') return resolve({ error: 'Workbench targets must be localhost lab servers' });
    const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
    if (!LAB_PORTS.has(port)) return resolve({ error: 'port ' + port + ' is not a lab port — the Workbench only talks to labs in the programme index' });
    const method = String(opts.method || 'GET').toUpperCase();
    const headers = wbParseHeaders(opts.headers);
    for (const k of Object.keys(headers)) { const lk = k.toLowerCase(); if (lk === 'host' || lk === 'content-length') delete headers[k]; }
    let body = (opts.body == null) ? '' : String(opts.body);
    if (method === 'GET' || method === 'HEAD') body = '';
    if (body) headers['Content-Length'] = Buffer.byteLength(body);
    const lib = url.protocol === 'https:' ? require('node:https') : http;
    const req = lib.request(url, { method, headers, timeout: 15000 }, (resp) => {
      const chunks = []; let size = 0;
      resp.on('data', c => { size += c.length; if (size <= 200 * 1024) chunks.push(c); });
      resp.on('end', () => {
        const buf = Buffer.concat(chunks);
        wbHistory.unshift({ time: new Date().toISOString(), labPort: port, method, url: url.toString(), status: resp.statusCode, reqHeaders: typeof opts.headers === 'string' ? opts.headers : Object.entries(wbParseHeaders(opts.headers)).map(([k, v]) => k + ': ' + v).join('\n'), reqBody: body });
        if (wbHistory.length > 100) wbHistory.length = 100;
        resolve({ status: resp.statusCode, statusText: resp.statusMessage || '', headers: resp.headers, body: buf.toString('utf8'), truncated: size > buf.length });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ error: 'request timed out after 15s (is the lab running?)' }); });
    req.on('error', e => resolve({ error: 'request failed: ' + e.message + ' (is the lab running?)' }));
    if (body) req.write(body);
    req.end();
  });
}

/* ---------------- tiny markdown ---------------- */
function md(mdText){
  let h = esc(mdText);
  h = h.replace(/```([\s\S]*?)```/g, (m, c) => '<pre>' + c.trim() + '</pre>');
  h = h.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>').replace(/^\s*\d+\. (.*)$/gm, '<li>$1</li>');
  h = h.replace(/(<li>[\s\S]*?<\/li>)/g, '$1');
  h = h.split(/\n{2,}/).map(b => /^<(h\d|li|pre)/.test(b.trim()) ? b : '<p>' + b.replace(/\n/g, '<br>') + '</p>').join('\n');
  return h;
}

/* ---------------- pages ---------------- */
const CSS = 'body{margin:0;font-family:-apple-system,"Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif;background:#0B1020;color:#EDF0F7}a{color:#7C6CF0}main{max-width:1180px;margin:0 auto;padding:24px 16px 80px}h1,h2,h3{letter-spacing:-.01em}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:12px}.card{background:#121830;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;box-shadow:0 1px 2px rgba(0,0,0,.35)}.bar{height:8px;background:rgba(255,255,255,.08);border-radius:6px;overflow:hidden}.bar>i{display:block;height:100%;background:#7C6CF0}button{background:#141B33;color:#EDF0F7;border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:6px 12px;cursor:pointer;font-size:13px}button:hover{background:#1A2242}button.go{background:linear-gradient(135deg,#7C5CFC,#5568E8);border:none;color:#fff;font-weight:600}button.go:hover{filter:brightness(1.08)}.muted{color:#9AA3B8;font-size:13px}.badge{font-size:11px;padding:2px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.08);margin-left:7px;vertical-align:middle;white-space:nowrap}pre{background:#0E1428;border:1px solid rgba(255,255,255,.08);padding:14px;border-radius:10px;overflow:auto;line-height:1.5}code{background:#0E1428;padding:1px 6px;border-radius:5px}li{margin:4px 0;line-height:1.55}p{line-height:1.6}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,summary:focus-visible{outline:2px solid rgba(124,108,240,.45);outline-offset:1px}';
function page(title, body){ return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + ' · HexaCyberLab Gateway</title><style>' + CSS + '</style></head><body><main>' + body + '</main></body></html>'; }

function rsMilestoneCard(blockNo){
  const lab = RS_LABS.find(l => l.afterCategory === blockNo);
  if (!lab) return '';
  const p = progressOf(lab);
  const note = runtimeOk(lab) ? '' : '<div style="color:#D9A45B;font-size:13px;margin-top:4px">\u26a0 This milestone needs <b>' + esc(lab.needs || lab.runtime) + '</b>, which was not detected on this machine \u2014 see the lab README for the one-time setup. Nothing is broken; the lab simply cannot start until the runtime exists.</div>';
  const depNote = (lab.runtime === 'python3' || /express/i.test(lab.stack || '')) ? '<div class="muted" style="margin-top:4px">First start installs its dependencies (one-time) \u2014 watch the Console, then Open the lab.</div>' : '';
  return '<div id="rs-' + lab.port + '" style="margin:12px 0 4px;background:#121830;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 18px;box-shadow:0 1px 2px rgba(0,0,0,.35)">' +
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap"><div>' +
    '<b style="font-size:16px">\ud83c\udf93 ' + lab.number + ' \u2014 ' + esc(lab.name) + '</b><span class="badge" style="color:' + p.statusColor + '">' + (p.status === 'Locked' ? 'Not started' : p.status) + '</span>' +
    '<div class="muted">Real Stack milestone \u00b7 after LAB ' + (blockNo * 10) + ' \u00b7 ' + esc(lab.stack) + ' \u00b7 http://localhost:' + lab.port + ' \u00b7 ' + p.total + ' tests \u00b7 \u23f1 ' + fmtEst(lab.estMinutes) + ' \u00b7 \ud83c\udf9a ' + esc(lab.difficulty || 'Mixed') + '</div>' + note + depNote + '</div>' +
    '<span class="st muted">checking\u2026</span></div>' +
    '<div class="bar" style="margin:8px 0"><i style="width:' + p.pct + '%"></i></div>' +
    '<div><span class="pct">' + p.done + '/' + p.total + ' \u00b7 ' + p.pct + '%</span></div>' +
    '<div style="margin-top:9px;display:flex;gap:6px"><button class="go" onclick="act(' + lab.port + ',\'start\')">\u25b6 Start</button>' +
    '<button onclick="act(' + lab.port + ',\'stop\')">\u25a0 Stop</button>' +
    '<a href="/open?port=' + lab.port + '" target="_blank"><button>Open lab \u2197</button></a>' +
    '<a href="/logs?port=' + lab.port + '"><button>\ud83d\udcdf Console</button></a>' +
    '<button onclick="resetLab(' + lab.port + ')">\u21ba Reset</button></div></div>';
}
function rsScript(){
  if (!RS_LABS.length) return '';
  return '<script>async function rsRefresh(){try{var j=await (await fetch("/api/rs-labs")).json();j.labs.forEach(function(l){var el=document.getElementById("rs-"+l.port);if(!el)return;var st=el.querySelector(".st");if(st){st.textContent=l.running?"\u25cf running":"\u25cb stopped";st.style.color=l.running?"#3FB68B":"";}var pc=el.querySelector(".pct");if(pc)pc.textContent=l.done+"/"+l.total+" \u00b7 "+l.pct+"%";var bar=el.querySelector(".bar>i");if(bar)bar.style.width=l.pct+"%";var bg=el.querySelector(".badge");if(bg&&l.status){bg.textContent=l.status==="Locked"?"Not started":l.status;bg.style.color=l.statusColor;}});}catch(e){}}rsRefresh();setInterval(rsRefresh,4000);</' + 'script>';
}

function dashboardPage(){
  const cats = [...new Set(LABS.map(l => l.category))];
  const gwState = readState();
  const contLab = (gwState.lastPort && byPort.get(gwState.lastPort)) || LABS.find(l => progressOf(l).status === 'In progress') || null;
  const contChip = contLab ? '<p><a id="contBtn" href="/open?port=' + contLab.port + '"><button class="go" style="font-size:15px;padding:9px 18px">▶ Continue: LAB ' + contLab.number + ' — ' + esc(contLab.name) + ' (' + progressOf(contLab).pct + '%)</button></a></p>' : '<p><a id="contBtn" href="#" style="display:none"><button class="go"></button></a></p>';
  let totalDone = 0, totalTests = 0;
  let sections = '';
  for (let ci = 0; ci < cats.length; ci++) { const cat = cats[ci];
    const labs = LABS.filter(l => l.category === cat);
    const catDone = labs.reduce((s, l) => s + progressOf(l).done, 0);
    const catTotal = labs.reduce((s, l) => s + progressOf(l).total, 0);
    const catPct = catTotal ? Math.floor(catDone / catTotal * 100) : 0;
    sections += '<h2 style="margin-top:30px">' + esc(cat.replace(/^\d+-/, '').replace(/-/g, ' ')) + '</h2>' +
      '<div style="display:flex;align-items:center;gap:10px;margin:0 0 10px"><div class="bar" style="flex:1"><i class="catfill" data-cat="' + esc(cat) + '" style="width:' + catPct + '%"></i></div><span class="muted cattxt" data-cat="' + esc(cat) + '">' + catDone + '/' + catTotal + ' · ' + catPct + '%</span></div><div class="grid">';
    for (const lab of labs) {
      const p = progressOf(lab); totalDone += p.done; totalTests += p.total;
      sections += '<div class="card" id="lab-' + lab.port + '"><b>LAB ' + lab.number + ' — ' + esc(lab.name) + '</b><span class="badge" style="color:' + p.statusColor + '">' + p.status + '</span>' +
        '<div class="muted">http://localhost:' + lab.port + ' · ' + p.total + ' tests · ⏱ ' + fmtEst(lab.estMinutes) + ' · 🎚 ' + esc(lab.difficulty || 'Mixed') + '</div>' +
        '<div class="bar" style="margin:8px 0"><i style="width:' + p.pct + '%"></i></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center"><span class="pct">' + p.done + '/' + p.total + ' · ' + p.pct + '%</span>' +
        '<span class="st muted">checking…</span></div>' +
        '<div style="margin-top:9px;display:flex;gap:6px"><button class="go" onclick="act(' + lab.port + ',\'start\')">▶ Start</button>' +
        '<button onclick="act(' + lab.port + ',\'stop\')">■ Stop</button>' +
        '<a href="/open?port=' + lab.port + '" target="_blank"><button>Open lab ↗</button></a>' +
        '<a href="/logs?port=' + lab.port + '"><button>📟 Console</button></a>' +
        '<button onclick="resetLab(' + lab.port + ')">↺ Reset</button></div></div>';
    }
    sections += '</div>';
    sections += rsMilestoneCard(ci + 1);
  }
  const lotd = LABS.slice().sort((a, b) => a.number - b.number)[Math.floor(Date.now() / 86400000) % LABS.length];
  const lotdBanner = '<div style="background:#121830;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 18px;margin:16px 0;display:flex;justify-content:space-between;align-items:center;gap:14px"><div><div style="font-size:17px">🌟 <b>Lab of the Day — LAB ' + lotd.number + ': ' + esc(lotd.name) + '</b></div><div class="muted">A fresh pick every day · ⏱ ' + fmtEst(lotd.estMinutes) + ' · 🎚 ' + esc(lotd.difficulty) + ' · ' + lotd.tests.length + ' tests</div></div><a href="/open?port=' + lotd.port + '" target="_blank"><button class="go">Open today\'s lab ↗</button></a></div>';
  const body = '<h1>⬢ HexaCyberLab — Programme Dashboard</h1>' +
    '<p class="muted">110 labs · ' + totalTests + ' scored tests · <b>' + totalDone + ' passed overall</b>. Start a lab, open it, and watch the live console: every request the server receives, everything it accepts and sends back, and every test the moment it passes. Switch labs by changing the port in the URL — each port is a different lab, exactly like a different website.</p>' +
    '<p><a href="/workbench"><button class="go">🧰 Open Workbench</button></a> <a href="/business"><button>💼 Business Skills (unlockable)</button></a> <a href="/cases"><button>📖 Real-World Case Studies</button></a> <a href="/certificates"><button>🏆 Certificates</button></a> <a href="/random"><button>🎲 Random lab</button></a> <a href="/api/export-progress"><button>⬇ Export progress</button></a> <button onclick="document.getElementById(\'impFile\').click()">⬆ Import progress</button><input type="file" id="impFile" accept="application/json" style="display:none"></p>' +
    contChip +
    lotdBanner +
    '<div style="background:#121830;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 18px;margin:16px 0"><b>🔎 Find a vulnerability to practise</b><div class="muted" style="margin:4px 0 10px">Search ' + totalTests + ' tests across all 110 labs — try “SQL injection”, “IDOR”, “SSRF”, “race condition”… (press / to jump here)</div><input id="vsearch" type="text" placeholder="Type a vulnerability, e.g. IDOR" style="width:100%;box-sizing:border-box;background:#0E1428;color:#EDF0F7;border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px 12px;font-size:15px"><div id="vresults" style="margin-top:6px"></div></div>' +
    '<div style="display:flex;gap:18px;align-items:center;background:#121830;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 18px;margin:16px 0"><svg width="92" height="92" viewBox="0 0 92 92"><circle cx="46" cy="46" r="38" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/><circle id="ringFg" cx="46" cy="46" r="38" fill="none" stroke="#3FB68B" stroke-width="9" stroke-linecap="round" stroke-dasharray="238.8" stroke-dashoffset="' + (238.8 * (1 - (totalTests ? totalDone / totalTests : 0))).toFixed(1) + '" transform="rotate(-90 46 46)"/><text id="ringPct" x="46" y="51" text-anchor="middle" fill="#EDF0F7" font-size="17" font-weight="bold">' + (totalTests ? Math.floor(totalDone / totalTests * 100) : 0) + '%</text></svg><div><div style="font-size:19px"><b id="ringDone">' + totalDone + '</b> of ' + totalTests + ' tests passed across all 110 labs</div><div class="muted">Your whole programme at a glance — the ring fills as tests pass, and a lab card turns Completed at 100%.</div></div></div>' +
    sections +
    '<script>var SIDX=null;var CLSL={sqli:"SQL Injection",idor:"IDOR / Broken Access Control",xss:"Cross-Site Scripting (XSS)",csrf:"CSRF",ssrf:"SSRF",xxe:"XXE","file-upload":"File Upload","path-traversal":"Path Traversal",jwt:"JWT / Token Attacks","brute-force":"Brute Force","password-storage":"Password Storage","default-credentials":"Default Credentials","mass-assignment":"Mass Assignment","api-exposure":"Data Exposure","race-condition":"Race Condition","business-logic":"Business Logic","prompt-injection":"Prompt Injection / LLM","rce-injection":"RCE / Code Injection","open-redirect":"Open Redirect",misconfiguration:"Misconfiguration","auth-bypass":"Authentication",graphql:"GraphQL",nosql:"NoSQL Injection","prototype-pollution":"Prototype Pollution",general:"General"};function E(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}function clsLabel(c){return CLSL[c]||c;}var vs=document.getElementById("vsearch"),vr=document.getElementById("vresults");document.addEventListener("keydown",function(e){if(e.key==="/"&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();vs.focus();}});vs.addEventListener("input",async function(){var q=vs.value.trim().toLowerCase();if(q.length<2){vr.innerHTML="";return;}if(!SIDX){try{SIDX=await (await fetch("/api/search-index")).json();}catch(e){vr.innerHTML="<div class=\\"muted\\">Search index unavailable.</div>";return;}}var out=[];SIDX.forEach(function(l){var hits=l.tests.filter(function(t){return t.name.toLowerCase().indexOf(q)>-1||clsLabel(t.cls).toLowerCase().indexOf(q)>-1||t.cls.indexOf(q)>-1;});if(!hits.length&&l.name.toLowerCase().indexOf(q)>-1)hits=l.tests.slice(0,3);if(hits.length)out.push({l:l,hits:hits});});if(!out.length){vr.innerHTML="<div class=\\"muted\\" style=\\"padding-top:6px\\">No matching tests — try a shorter word, like sql, idor, xss, token, upload.</div>";return;}vr.innerHTML=out.slice(0,12).map(function(o){return "<div style=\\"padding:8px 0;border-top:1px solid rgba(255,255,255,.08)\\"><b>LAB "+o.l.number+" — "+E(o.l.name)+"</b> <span class=\\"muted\\">"+o.hits.length+" matching test"+(o.hits.length>1?"s":"")+"</span> <a href=\\"/open?port="+o.l.port+"\\" target=\\"_blank\\"><button class=\\"go\\">Open lab ↗</button></a><div class=\\"muted\\">"+o.hits.slice(0,6).map(function(t){return E(t.name);}).join(" · ")+(o.hits.length>6?" · +"+(o.hits.length-6)+" more":"")+"</div></div>";}).join("")+(out.length>12?"<div class=\\"muted\\">…and "+(out.length-12)+" more labs — refine the search.</div>":"");});</' + 'script>' +
    '<script>async function act(port,kind){await fetch("/api/"+kind+"?port="+port,{method:"POST"});setTimeout(refresh,600);}async function resetLab(port){if(!confirm("Reset this lab? Its saved progress, state and runtime database will be deleted so it starts completely fresh."))return;await fetch("/api/reset?port="+port,{method:"POST"});setTimeout(refresh,600);}var impF=document.getElementById("impFile");if(impF)impF.addEventListener("change",async function(){var f=impF.files[0];if(!f)return;try{var t=await f.text();var r=await (await fetch("/api/import-progress",{method:"POST",headers:{"Content-Type":"application/json"},body:t})).json();alert(r.ok?("Progress imported for "+r.imported+" lab(s)."):("Import failed: "+(r.error||"unknown error")));}catch(e){alert("Import failed — could not read the file.");}impF.value="";refresh();});async function refresh(){try{var j=await (await fetch("/api/labs")).json();j.labs.forEach(function(l){var el=document.getElementById("lab-"+l.port);if(!el)return;el.querySelector(".st").textContent=l.running?"● running":"○ stopped";el.querySelector(".st").style.color=l.running?"#3FB68B":"";el.querySelector(".pct").textContent=l.done+"/"+l.total+" · "+l.pct+"%";el.querySelector(".bar>i").style.width=l.pct+"%";var bg=el.querySelector(".badge");if(bg&&l.status){bg.textContent=l.status;bg.style.color=l.statusColor;}});var td=0,tt=0;j.labs.forEach(function(l){td+=l.done;tt+=l.total;});var pc=tt?Math.floor(td/tt*100):0;var rf=document.getElementById("ringFg");if(rf)rf.style.strokeDashoffset=(238.8*(1-pc/100)).toFixed(1);var rp=document.getElementById("ringPct");if(rp)rp.textContent=pc+"%";var rd=document.getElementById("ringDone");if(rd)rd.textContent=td;var ca={};j.labs.forEach(function(l){ca[l.category]=ca[l.category]||{d:0,t:0};ca[l.category].d+=l.done;ca[l.category].t+=l.total;});Object.keys(ca).forEach(function(k){var pc2=ca[k].t?Math.floor(ca[k].d/ca[k].t*100):0;var cf=document.querySelector(".catfill[data-cat=\\""+k+"\\"]");if(cf)cf.style.width=pc2+"%";var ct=document.querySelector(".cattxt[data-cat=\\""+k+"\\"]");if(ct)ct.textContent=ca[k].d+"/"+ca[k].t+" · "+pc2+"%";});var cb=document.getElementById("contBtn");if(cb&&j.lastPort){var ll=null;j.labs.forEach(function(x){if(x.port===j.lastPort)ll=x;});if(ll){cb.style.display="";cb.href="/open?port="+ll.port;var bb=cb.querySelector("button");if(bb)bb.textContent="▶ Continue: LAB "+ll.number+" — "+ll.name+" ("+ll.pct+"%)";}}}catch(e){}}refresh();setInterval(refresh,4000);</' + 'script>';
  return page('Dashboard', body + rsScript());
}

function logsPage(port){
  const lab = byPort.get(Number(port));
  const body = '<p><a href="/">← Dashboard</a></p><h1>📟 Live server console — ' + (lab ? 'LAB ' + lab.number + ' ' + esc(lab.name) : port) + '</h1>' +
    '<p class="muted">Everything this lab\'s server receives, accepts and sends back — live, like watching a real production server. Requests you make in the lab (or with Burp / the Workbench / curl) appear here the moment they happen; passed tests are announced with a ★.</p>' +
    '<div id="log" style="background:#0E1428;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px;font-family:Consolas,monospace;font-size:13px;height:65vh;overflow:auto;white-space:pre-wrap"></div>' +
    '<script>var el=document.getElementById("log");var es=new EventSource("/api/logs?port=' + port + '");es.onmessage=function(e){var line=JSON.parse(e.data);var d=document.createElement("div");if(line.indexOf("★")>-1)d.style.color="#3FB68B";d.textContent=line;el.appendChild(d);el.scrollTop=el.scrollHeight;};</' + 'script>';
  return page('Console', body);
}

function workbenchPage(labPort){
  const lab = byPort.get(Number(labPort)) || LABS[0];
  const port = lab ? lab.port : 3000;
  const hintLabs = Object.keys(HINTS).map(dir => ALL_LABS.find(l => l.dir === dir)).filter(Boolean);
  const opts = hintLabs.map(l => '<option value="' + esc(l.dir) + '" data-port="' + l.port + '"' + (lab && l.dir === lab.dir ? ' selected' : '') + '>LAB ' + l.number + ' — ' + esc(l.name) + '</option>').join('');
  const body = `<style>
.wbgrid{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:900px){.wbgrid{grid-template-columns:1fr}}
.wbcard{background:#121830;border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:14px 16px;margin-bottom:14px;box-shadow:0 1px 2px rgba(0,0,0,.35)}
.wbcard h2{margin:0 0 10px;font-size:17px}
.wbcard input[type=text],.wbcard select,.wbcard textarea{background:#0E1428;color:#EDF0F7;border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:8px 10px;font-size:13px;font-family:Consolas,monospace;box-sizing:border-box}
.wbcard textarea{width:100%;resize:vertical}
.wbrow{display:flex;gap:8px;flex-wrap:wrap}.wbrow>*{margin-bottom:8px}
#wbRespBody,#wbRespHeaders{max-height:46vh;white-space:pre-wrap;word-break:break-word}
#mHints details{background:#141B33;border:1px solid rgba(255,255,255,.08);border-radius:10px;margin:0 0 8px}
#mHints summary{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;color:#EDF0F7;font-size:13.5px;list-style:none}
#mHints summary::-webkit-details-marker{display:none}
#mHints summary::after{content:"▾";color:#6B7386;font-size:11px;flex:0 0 auto;transition:transform .15s ease}
#mHints details[open]>summary::after{transform:rotate(180deg)}
#mHints summary:hover{background:rgba(255,255,255,.03)}
#mHints details>p{margin:0;padding:0 14px 12px;color:#9AA3B8;font-size:13.5px;line-height:1.6}
#mSol{background:#0E1428;border:1px solid rgba(255,255,255,.08);border-left:3px solid #7C6CF0;border-radius:10px;padding:12px 14px;white-space:pre-wrap;line-height:1.6}
</style>
<p><a href="/">← Dashboard</a></p>
<h1>🧰 Hexa Workbench — Burp-lite for the labs</h1>
<p class="muted">Craft and replay HTTP requests against the labs, Burp-Repeater style. The Workbench only talks to lab servers on this machine (localhost + a lab port from the programme index) — anything else is rejected. If a request fails, start the lab from the dashboard first. Requests you send also appear in the lab's live console.</p>
<div class="wbcard"><h2>🎯 Mission</h2>
<div class="wbrow"><select id="mLab" onchange="missionLabChanged()">${opts}</select>
<select id="mMode" onchange="setMode()"><option value="guided">Guided (hints available)</option><option value="unguided">Unguided (no help)</option></select></div>
<p id="mObj" style="line-height:1.6"></p>
<div id="mHelp"><div id="mHints"></div>
<div class="wbrow"><button id="mSolBtn" onclick="toggleSol()">📖 Reveal solution</button></div>
<div id="mSol" style="display:none"></div></div></div>
<div class="wbgrid"><div>
<div class="wbcard"><h2>✉️ Request builder</h2>
<div class="wbrow"><select id="wbMethod"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option><option>PATCH</option></select>
<input type="text" id="wbUrl" style="flex:1;min-width:260px" value="http://localhost:${port}/"></div>
<textarea id="wbHeaders" rows="4" placeholder="Headers — one per line, e.g.&#10;Cookie: session=abc123&#10;Content-Type: application/json"></textarea>
<textarea id="wbBody" rows="6" placeholder="Request body (sent for POST / PUT / PATCH / DELETE)"></textarea>
<div class="wbrow" style="margin-top:8px"><button class="go" onclick="sendWb()">▶ Send request</button><span class="muted" id="wbStatus"></span></div></div>
<div class="wbcard"><h2>📨 Response</h2>
<div style="font-size:16px;margin-bottom:8px">Status: <b id="wbRespStatus">—</b></div>
<div class="muted">Headers</div><pre id="wbRespHeaders"></pre>
<div class="muted">Body</div><pre id="wbRespBody"></pre></div>
</div><div>
<div class="wbcard"><h2>🕘 History</h2><div id="wbHist"><div class="muted">No requests sent yet.</div></div>
<p class="muted">Click an entry to reload that request into the builder.</p></div>
<div class="wbcard"><h2>🔣 Decoder</h2>
<textarea id="decIn" rows="5" placeholder="Paste text, Base64, hex or a JWT here"></textarea>
<div class="wbrow" style="margin-top:8px"><button onclick="decB64e()">Base64 encode</button><button onclick="decB64d()">Base64 decode</button><button onclick="decUrlE()">URL encode</button><button onclick="decUrlD()">URL decode</button><button onclick="decJwt()">JWT decode</button><button onclick="decHexE()">Hex encode</button><button onclick="decHexD()">Hex decode</button></div>
<pre id="decOut" style="white-space:pre-wrap;word-break:break-word"></pre></div>
</div></div>
<script>
var HIST=[], M=null;
function E(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
function pretty(b){try{return JSON.stringify(JSON.parse(b),null,2);}catch(e){return b;}}
async function sendWb(){
  var st=document.getElementById("wbStatus"); st.textContent="sending…";
  var payload={method:document.getElementById("wbMethod").value, url:document.getElementById("wbUrl").value.trim(), headers:document.getElementById("wbHeaders").value, body:document.getElementById("wbBody").value};
  try{
    var r=await fetch("/api/wb/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    var j=await r.json();
    if(j.error){ st.textContent="⚠ "+j.error; document.getElementById("wbRespStatus").textContent="—"; document.getElementById("wbRespHeaders").textContent=""; document.getElementById("wbRespBody").textContent=""; loadHistory(); return; }
    st.textContent="";
    document.getElementById("wbRespStatus").textContent=j.status+" "+j.statusText+(j.truncated?" · (body truncated at 200 KB)":"");
    document.getElementById("wbRespHeaders").textContent=Object.keys(j.headers||{}).map(function(k){return k+": "+j.headers[k];}).join("\\n");
    document.getElementById("wbRespBody").textContent=pretty(j.body||"");
  }catch(e){ st.textContent="⚠ "+e.message; }
  loadHistory();
}
async function loadHistory(){
  try{
    var j=await (await fetch("/api/wb/history")).json(); HIST=j.history||[];
    document.getElementById("wbHist").innerHTML=HIST.length?HIST.map(function(h,i){return "<div style='padding:7px 0;border-top:1px solid rgba(255,255,255,.08);cursor:pointer' onclick='loadHist("+i+")'><b>"+E(h.method)+"</b> "+E(h.url)+" → <b>"+h.status+"</b> <span class='muted'>"+E(String(h.time).replace("T"," ").slice(0,19))+" · lab :"+h.labPort+"</span></div>";}).join(""):"<div class='muted'>No requests sent yet.</div>";
  }catch(e){}
}
function loadHist(i){ var h=HIST[i]; if(!h) return; document.getElementById("wbMethod").value=h.method; document.getElementById("wbUrl").value=h.url; document.getElementById("wbHeaders").value=h.reqHeaders||""; document.getElementById("wbBody").value=h.reqBody||""; window.scrollTo(0,0); }
function decOut(t){ document.getElementById("decOut").textContent=t; }
function decIn(){ return document.getElementById("decIn").value; }
function decB64e(){ try{ decOut(btoa(unescape(encodeURIComponent(decIn())))); }catch(e){ decOut("⚠ "+e.message); } }
function decB64d(){ try{ decOut(decodeURIComponent(escape(atob(decIn().trim())))); }catch(e){ decOut("⚠ not valid Base64 ("+e.message+")"); } }
function decUrlE(){ decOut(encodeURIComponent(decIn())); }
function decUrlD(){ try{ decOut(decodeURIComponent(decIn())); }catch(e){ decOut("⚠ "+e.message); } }
function b64url(s){ s=s.replace(/-/g,"+").replace(/_/g,"/"); while(s.length%4) s+="="; return atob(s); }
function decJwt(){ try{ var p=decIn().trim().split("."); if(p.length<2) throw new Error("a JWT has at least 2 dot-separated parts"); decOut("HEADER\\n"+pretty(b64url(p[0]))+"\\n\\nPAYLOAD\\n"+pretty(b64url(p[1]))); }catch(e){ decOut("⚠ not a decodable JWT ("+e.message+")"); } }
function decHexE(){ var s=decIn(), o=""; for(var i=0;i<s.length;i++){ var h=s.charCodeAt(i).toString(16); o+=(h.length<2?"0":"")+h; } decOut(o); }
function decHexD(){ try{ var s=decIn().replace(/\\s+/g,""); if(s.length%2||/[^0-9a-fA-F]/.test(s)) throw new Error("hex input must be an even number of hex digits"); var o=""; for(var i=0;i<s.length;i+=2) o+=String.fromCharCode(parseInt(s.substr(i,2),16)); decOut(o); }catch(e){ decOut("⚠ "+e.message); } }
async function loadMission(){
  var dir=document.getElementById("mLab").value;
  document.getElementById("mHints").innerHTML=""; var sol=document.getElementById("mSol"); sol.style.display="none"; sol.textContent="";
  try{
    var r=await fetch("/api/hints?lab="+encodeURIComponent(dir)); var j=await r.json();
    if(j.error){ document.getElementById("mObj").textContent="No mission authored for this lab yet."; M=null; return; }
    M=j; document.getElementById("mObj").textContent=j.objective||"";
    document.getElementById("mHints").innerHTML=(j.hints||[]).map(function(h){ return "<details><summary><b>"+E(h.title||"Hint")+"</b></summary><p>"+E(h.body||"")+"</p></details>"; }).join("");
  }catch(e){ document.getElementById("mObj").textContent="Mission unavailable."; M=null; }
}
function toggleSol(){ var s=document.getElementById("mSol"); if(!M) return; if(s.style.display==="none"){ s.textContent=M.solution||""; s.style.display="block"; } else { s.style.display="none"; } }
function setMode(){ var ung=document.getElementById("mMode").value==="unguided"; document.getElementById("mHelp").style.display=ung?"none":"block"; }
function missionLabChanged(){ var sel=document.getElementById("mLab"); var port=sel.options[sel.selectedIndex].getAttribute("data-port"); if(port) document.getElementById("wbUrl").value="http://localhost:"+port+"/"; loadMission(); }
loadMission(); loadHistory();
</script>`;
  return page('Hexa Workbench', body);
}
function businessPage(){
  const dir = path.join(ROOT, 'business-skills');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^\d{2}-.*\.md$/.test(f)).sort() : [];
  const cats = [...new Set(LABS.map(l => l.category))];
  let items = '';
  files.forEach((f, i) => {
    const cat = cats[i];
    let unlocked = false, catPct = 0;
    if (cat) { const labs = LABS.filter(l => l.category === cat); const tot = labs.reduce((s, l) => s + progressOf(l).total, 0); const dn = labs.reduce((s, l) => s + progressOf(l).done, 0); catPct = tot ? Math.floor(dn / tot * 100) : 0; unlocked = labs.length > 0 && labs.every(l => progressOf(l).complete); }
    const title = f.replace(/^\d{2}-/, '').replace(/-/g, ' ').replace(/\.md$/, '');
    items += '<div class="card" style="margin:10px 0">' + (unlocked ? '<a href="/business/' + (i + 1) + '"><b>🔓 Lesson ' + (i + 1) + ' — ' + esc(title) + '</b></a>' : '<b>🔒 Lesson ' + (i + 1) + ' — ' + esc(title) + '</b>') +
      '<div class="muted">Unlocks when category ' + (i + 1) + ' (' + esc(cat ? cat.replace(/^\d+-/, '').replace(/-/g, ' ') : '') + ') reaches 100% — currently ' + catPct + '%</div></div>';
  });
  return page('Business Skills', '<p><a href="/">← Dashboard</a></p><h1>💼 Business Skills — the career ladder</h1><p class="muted">Technique gets you in the door; business skill gets you paid. Finish a category 100% and its business lesson unlocks: pricing, scope documents, client conversations, proposals, delivery, retainers.</p>' + items);
}
function businessLesson(n){
  const dir = path.join(ROOT, 'business-skills');
  const files = fs.readdirSync(dir).filter(f => /^\d{2}-.*\.md$/.test(f)).sort();
  const f = files[n - 1]; if (!f) return null;
  const cats = [...new Set(LABS.map(l => l.category))];
  const cat = cats[n - 1];
  const unlocked = cat && LABS.filter(l => l.category === cat).every(l => progressOf(l).complete);
  if (!unlocked) return page('Locked', '<p><a href="/business">← Business Skills</a></p><h1>🔒 Locked</h1><p>Finish every lab in category ' + n + ' (' + esc(cat ? cat.replace(/^\d+-/, '').replace(/-/g, ' ') : '') + ') to unlock this lesson.</p>');
  return page('Lesson ' + n, '<p><a href="/business">← Business Skills</a></p>' + md(fs.readFileSync(path.join(dir, f), 'utf8')));
}
function certificatesPage(){
  const earned = LABS.filter(l => progressOf(l).complete);
  let cards = '';
  for (const lab of LABS) {
    const p = progressOf(lab);
    if (p.complete) {
      cards += '<div class="card" style="border-color:rgba(63,182,139,.45);background:#141B33"><b>🏆 LAB ' + lab.number + ' — ' + esc(lab.name) + '</b>' +
        '<div class="muted">' + p.total + ' tests · completed 100%</div>' +
        '<div style="margin-top:9px"><a href="/open?port=' + lab.port + '&to=/certificate" target="_blank"><button class="go">View certificate ↗</button></a></div></div>';
    } else {
      cards += '<div class="card" style="opacity:.75"><b>LAB ' + lab.number + ' — ' + esc(lab.name) + '</b>' +
        '<div class="muted">' + p.done + '/' + p.total + ' tests · ' + p.pct + '% — certificate locks at 100%</div>' +
        '<div class="bar" style="margin-top:8px"><i style="width:' + p.pct + '%"></i></div></div>';
    }
  }
  let rsSection = '';
  if (RS_LABS.length) {
    let rsCards = '';
    for (const lab of RS_LABS) {
      const p = progressOf(lab);
      rsCards += p.complete
        ? '<div class="card" style="border-color:rgba(63,182,139,.45);background:#141B33"><b>\ud83c\udf93 ' + lab.number + ' \u2014 ' + esc(lab.name) + '</b><div class="muted">' + esc(lab.stack) + ' \u00b7 milestone completed 100%</div></div>'
        : '<div class="card" style="opacity:.75"><b>\ud83c\udf93 ' + lab.number + ' \u2014 ' + esc(lab.name) + '</b><div class="muted">' + p.done + '/' + p.total + ' tests \u00b7 ' + p.pct + '% \u2014 milestone badge at 100%</div><div class="bar" style="margin-top:8px"><i style="width:' + p.pct + '%"></i></div></div>';
    }
    rsSection = '<h2 style="margin-top:28px">\ud83c\udf93 Real Stack Milestones</h2><div class="grid">' + rsCards + '</div>';
  }
  return page('Certificates', '<p><a href="/">← Dashboard</a></p><h1>🏆 Certificate Gallery</h1>' +
    '<p class="muted">Every lab you finish to 100% earns a signed HexaCyberLab certificate. You have earned <b>' + earned.length + ' of ' + LABS.length + '</b> so far — they are all collected here, ready to view and print.</p>' +
    '<div class="grid">' + cards + '</div>' + rsSection);
}
function casesPage(){
  let cases = {}; try { cases = JSON.parse(fs.readFileSync(path.join(__dirname, 'case-studies.json'), 'utf8')); } catch (e) {}
  const cards = Object.entries(cases).map(([k, cs]) => '<div class="card" style="margin:10px 0"><h3 style="margin-top:0">📌 ' + esc(cs.title) + '</h3><p><b>' + esc(cs.company) + '</b> · ' + esc(cs.year) + ' · <code>' + esc(k) + '</code></p><p>' + esc(cs.story) + '</p><p><b>Impact:</b> ' + esc(cs.impact) + '</p><p><b>Lesson:</b> ' + esc(cs.lesson) + '</p><p class="muted">Source: <a href="' + esc(cs.source_url) + '" target="_blank" rel="noopener">' + esc(cs.source_name) + '</a></p></div>').join('');
  return page('Case Studies', '<p><a href="/">← Dashboard</a></p><h1>📖 Real-World Case Studies</h1><p class="muted">Every vulnerability class in the labs, as it happened to a real company.</p>' + (cards || '<p>Case studies are being prepared.</p>'));
}

/* ---------------- http ---------------- */
function json(res, obj){ res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); }
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost:' + PORT);
  const p = u.pathname;
  try {
    if (p === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(dashboardPage()); }
    if (p === '/logs') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(logsPage(u.searchParams.get('port'))); }
    if (p === '/workbench') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(workbenchPage(u.searchParams.get('lab'))); }
    if (p === '/random') { const lab = LABS[Math.floor(Math.random() * LABS.length)]; res.writeHead(302, { Location: '/open?port=' + lab.port }); return res.end(); }
    if (p === '/business') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(businessPage()); }
    if (p.startsWith('/business/')) { const h = businessLesson(parseInt(p.split('/')[2], 10)); res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(h || page('Not found', '<h1>Not found</h1>')); }
    if (p === '/cases') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(casesPage()); }
    if (p === '/certificates') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(certificatesPage()); }
    if (p.startsWith('/vendor/')) { const f = path.join(__dirname, 'vendor', path.basename(p)); if (fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': p.endsWith('.css') ? 'text/css' : 'text/javascript' }); return res.end(fs.readFileSync(f)); } }
    if (p === '/open') {
      const lab = byPort.get(Number(u.searchParams.get('port')));
      if (!lab) { res.writeHead(302, { Location: '/' }); return res.end(); }
      writeState({ lastPort: lab.port, lastAt: Date.now() });
      const toRaw = u.searchParams.get('to') || '/';
      const to = (toRaw.startsWith('/') && !toRaw.startsWith('//')) ? toRaw : '/';
      if (isRunning(lab.port)) { res.writeHead(302, { Location: 'http://localhost:' + lab.port + to }); return res.end(); }
      startLab(lab);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(page('Starting lab', '<h1>▶ Starting LAB ' + lab.number + ' — ' + esc(lab.name) + '…</h1><p class="muted">One moment — sending you into the lab.</p><meta http-equiv="refresh" content="1.4;url=http://localhost:' + lab.port + to + '">'));
    }
    if (p === '/api/search-index') return json(res, ALL_LABS.map(l => ({ number: l.number, name: l.name, port: l.port, category: l.category, tests: l.tests })));
    if (p === '/api/rs-labs') return json(res, { labs: RS_LABS.map(l => { const pr = progressOf(l); return { number: l.number, name: l.name, port: l.port, running: isRunning(l.port), runtime: l.runtime || null, runtimeOk: runtimeOk(l), ...pr }; }) });
    if (p === '/api/labs') return json(res, { lastPort: readState().lastPort || null, labs: LABS.map(l => { const pr = progressOf(l); return { number: l.number, name: l.name, port: l.port, category: l.category, running: isRunning(l.port), ...pr }; }) });
    if (p === '/api/export-progress') {
      const labs = {};
      for (const l of ALL_LABS) { try { labs[l.relPath] = JSON.parse(fs.readFileSync(path.join(ROOT, l.relPath, 'progress.json'), 'utf8')); } catch (e) { /* lab not started yet */ } }
      res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="hexacyberlab-progress.json"' });
      return res.end(JSON.stringify({ app: 'hexacyberlab-progress', version: 1, exportedAt: new Date().toISOString(), labs }, null, 2));
    }
    if (p === '/api/import-progress' && req.method === 'POST') {
      let b = ''; req.on('data', d => { b += d; if (b.length > 4000000) req.destroy(); });
      req.on('end', () => {
        try {
          const j = JSON.parse(b || '{}');
          if (!j || typeof j !== 'object' || !j.labs || typeof j.labs !== 'object') return json(res, { ok: false, error: 'not a HexaCyberLab progress export' });
          const known = new Map(ALL_LABS.map(l => [l.relPath, l]));
          let imported = 0;
          for (const rel of Object.keys(j.labs)) {
            const lab = known.get(rel); const prog = j.labs[rel];
            if (!lab || !prog || typeof prog !== 'object') continue;
            stopLab(lab);
            fs.writeFileSync(path.join(ROOT, rel, 'progress.json'), JSON.stringify(prog, null, 2));
            signProgressFile(path.join(ROOT, rel));
            imported++;
          }
          return json(res, { ok: true, imported });
        } catch (e) { return json(res, { ok: false, error: 'invalid file' }); }
      });
      return;
    }
    if (p === '/api/reset') {
      const lab = byPort.get(Number(u.searchParams.get('port')));
      if (!lab) return json(res, { ok: false, error: 'unknown lab' });
      stopLab(lab);
      const removed = [];
      try {
        const dir = path.join(ROOT, lab.relPath);
        for (const f of fs.readdirSync(dir)) {
          if (f === 'progress.json' || f === 'progress.json.sig' || f === 'state.json' || /\.(db|sqlite|sqlite3)$/i.test(f)) { fs.rmSync(path.join(dir, f), { force: true }); removed.push(f); }
        }
        // Real Stack labs may keep their runtime store in a data/ folder (e.g. RS-09's JSON collections)
        if (lab.rs) {
          const dd = path.join(dir, 'data');
          if (fs.existsSync(dd)) for (const f of fs.readdirSync(dd)) { fs.rmSync(path.join(dd, f), { force: true }); removed.push('data/' + f); }
        }
      } catch (e) { /* lab folder unreadable — report what was removed */ }
      return json(res, { ok: true, removed });
    }
    if (p === '/api/start' || p === '/api/stop') {
      const lab = byPort.get(Number(u.searchParams.get('port')));
      if (!lab) return json(res, { ok: false, error: 'unknown lab' });
      const r = p === '/api/start' ? startLab(lab) : stopLab(lab);
      if (p === '/api/start' && r.ok) writeState({ lastPort: lab.port, lastAt: Date.now() });
      return json(res, r);
    }
    if (p === '/api/logs') {
      const port = Number(u.searchParams.get('port'));
      const c = children.get(port);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      if (c) { for (const line of c.lines) res.write('data: ' + JSON.stringify(line) + '\n\n'); c.clients.add(res); req.on('close', () => c.clients.delete(res)); }
      else res.write('data: ' + JSON.stringify('Lab is not running under the gateway. Start it from the dashboard first.') + '\n\n');
      return;
    }
    if (p === '/api/wb/send' && req.method === 'POST') {
      let b = ''; req.on('data', d => { b += d; if (b.length > 1000000) req.destroy(); });
      req.on('end', async () => { let j = {}; try { j = JSON.parse(b || '{}'); } catch (e) {} json(res, await wbSend(j)); });
      return;
    }
    if (p === '/api/wb/history') return json(res, { history: wbHistory });
    if (p === '/api/hints') {
      const entry = HINTS[u.searchParams.get('lab')];
      if (!entry) { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'no mission authored for this lab' })); }
      return json(res, entry);
    }
    res.writeHead(404); res.end('not found');
  } catch (e) { res.writeHead(500); res.end('gateway error: ' + e.message); }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('⬢ HexaCyberLab Gateway — http://localhost:' + PORT);
  console.log('  110 labs · dashboard · live consoles · workbench + missions · business skills');
  console.log('  Local only (127.0.0.1). Keep it that way — this gateway can start programs on your machine.');
});
