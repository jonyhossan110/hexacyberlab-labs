'use strict';
/* Pages served inside every lab by hexa-preload.js under /hexa/* :
   /hexa/debugger — Payload Debugger · /hexa/case-study — real-world case
   /hexa/burp — Burp quick-start for this lab. */
const fs = require('node:fs');
const path = require('node:path');

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
const CSS = 'body{margin:0;font-family:Arial,sans-serif;background:#14141d;color:#e8ebf4}main{max-width:860px;margin:0 auto;padding:26px 18px 70px}a{color:#9fc1ff}h1{font-size:24px}h2{font-size:18px;margin-top:28px}.card{background:#1d2333;border:1px solid #333a52;border-radius:12px;padding:16px 18px;margin:14px 0}textarea{width:100%;box-sizing:border-box;background:#0f1119;color:#e8ebf4;border:1px solid #333a52;border-radius:8px;padding:10px;font-family:Consolas,monospace;font-size:14px}select,button{background:#2a3350;color:#e8ebf4;border:1px solid #46538a;border-radius:8px;padding:8px 12px;font-size:14px}button{cursor:pointer;background:linear-gradient(90deg,#4f7cff,#9b5cff);border:none;color:#fff;font-weight:bold}.err{border-left:4px solid #e74c3c}.tip{border-left:4px solid #f1c40f}.info{border-left:4px solid #4f7cff}.lvl{font-weight:bold;text-transform:uppercase;font-size:11px;letter-spacing:1px;opacity:.8}code{background:#0f1119;padding:1px 6px;border-radius:5px;font-size:13px}.muted{color:#9aa3bd;font-size:14px;line-height:1.55}';
function shell(title, lab, body){
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+esc(title)+' · LAB '+lab.number+' — '+esc(lab.name)+'</title><style>'+CSS+'</style></head><body><main>'+
  '<p><a href="/">← Back to LAB '+lab.number+' — '+esc(lab.name)+'</a></p>'+body+'</main></body></html>';
}

function debuggerPage(lab){
  const analyzerSrc = fs.readFileSync(path.join(__dirname,'payload-analyzer.js'),'utf8');
  const classOpts = (lab.classes && lab.classes.length ? lab.classes : ['general']).map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('');
  const body = '<h1>🐛 Payload Debugger — why did your payload not work?</h1>'+
  '<p class="muted">A failed exploit tells you nothing today. Paste the exact payload you submitted, pick what you were testing, and the debugger takes it apart: what the server likely saw, where the syntax broke, what a filter probably did — and what direction to try next. It will not hand you the finished payload. Understanding the mistake is the skill.</p>'+
  '<div class="card"><label class="muted">Payload you submitted</label><textarea id="pl" rows="4" placeholder="Paste your payload exactly as sent…"></textarea>'+
  '<div style="margin:10px 0;display:flex;gap:10px;align-items:center"><select id="cls">'+classOpts+'</select><button onclick="run()">Analyse my payload</button></div>'+
  '<div id="out"></div></div>'+
  '<h2>Your recent attempts in this lab</h2><p class="muted">Captured live from this lab\'s traffic (newest first). Click one to load it into the analyser.</p><div id="recent"><p class="muted">Loading…</p></div>'+
  '<script>'+analyzerSrc+'\n'+
  'function run(){var p=document.getElementById("pl").value;var c=document.getElementById("cls").value;var r=HexaAnalyzer.analyze(p,c);document.getElementById("out").innerHTML=r.map(function(f){return "<div class=\\"card "+f[0]+"\\"><div class=\\"lvl\\">"+f[0]+"</div><div>"+f[1]+"</div></div>"}).join("");}'+
  'fetch("/hexa/recent").then(function(r){return r.json()}).then(function(j){var d=document.getElementById("recent");if(!j.items.length){d.innerHTML="<p class=muted>No attempts captured yet — try a payload in the lab first, then come back.</p>";return;}d.innerHTML=j.items.map(function(it,i){return "<div class=card style=\\"cursor:pointer\\" onclick=\\"load("+i+")\\"><code>"+it.method+" "+it.path+"</code> → <b>"+it.status+"</b> <span class=muted>"+it.time+"</span><br><code>"+String(it.body||it.query||"").slice(0,180).replace(/</g,"&lt;")+"</code></div>"}).join("");window._items=j.items;}).catch(function(){document.getElementById("recent").innerHTML="<p class=muted>Could not load attempts.</p>"});'+
  'function load(i){document.getElementById("pl").value=window._items[i].body||window._items[i].query||"";window.scrollTo(0,0);run();}'+
  '</'+'script>';
  return shell('Payload Debugger', lab, body);
}

function caseStudyPage(lab){
  let cases = {};
  try { cases = JSON.parse(fs.readFileSync(path.join(__dirname,'case-studies.json'),'utf8')); } catch(e) {}
  const FALLBACK = { 'auth-bypass': ['brute-force', 'password-storage'], 'graphql': ['api-exposure'], 'general': ['idor'] };
  let wanted = (lab.classes && lab.classes.length ? lab.classes.slice() : []);
  for (const c of wanted.slice()) if (!cases[c] && FALLBACK[c]) wanted.push(...FALLBACK[c]);
  wanted = [...new Set(wanted)];
  const cards = [];
  for (const c of wanted) {
    const cs = cases[c];
    if (!cs) continue;
    cards.push('<div class="card"><h2 style="margin-top:0">📌 '+esc(cs.title)+'</h2>'+
      '<p><b>'+esc(cs.company)+'</b> · '+esc(cs.year)+' · class: <code>'+esc(c)+'</code></p>'+
      '<p style="line-height:1.6">'+esc(cs.story)+'</p>'+
      '<p><b>Impact:</b> '+esc(cs.impact)+'</p>'+
      '<p><b>The lesson for this lab:</b> '+esc(cs.lesson)+'</p>'+
      '<p class="muted">Source: <a href="'+esc(cs.source_url)+'" target="_blank" rel="noopener">'+esc(cs.source_name)+'</a></p></div>');
  }
  const body = '<h1>📖 Real-world cases — this bug, in the wild</h1>'+
    '<p class="muted">Every technique in LAB '+lab.number+' has already happened to a real company. Read what it cost them — then go and find the same flaw here, safely.</p>'+
    (cards.length ? cards.join('') : '<div class="card"><p>Case studies for this lab\'s classes are being prepared. See the full collection in <code>case-studies/CASE-STUDIES.md</code> in the project.</p></div>');
  return shell('Real-World Cases', lab, body);
}

function burpPage(lab){
  const body = '<h1>🧰 Testing LAB '+lab.number+' with Burp Suite</h1>'+
  '<div class="card"><p><b>Target:</b> <code>http://localhost:'+lab.port+'</code> — this lab, running on your machine.</p>'+
  '<ol style="line-height:1.7"><li>Start Burp Suite → <b>Proxy</b> tab → make sure the listener on <code>127.0.0.1:8080</code> is running.</li>'+
  '<li>Click <b>Open browser</b> in Burp (no certificate setup needed — the labs are plain HTTP on localhost).</li>'+
  '<li>Open <code>http://localhost:'+lab.port+'</code> in that browser. Every request now lands in <b>Proxy → HTTP history</b>.</li>'+
  '<li>Right-click any request → <b>Send to Repeater</b> to edit and resend it by hand (IDs, prices, roles), or <b>Send to Intruder</b> to automate attempts (login brute force).</li>'+
  '<li>Watch this lab\'s PowerShell/console window while you work — the Hexa gateway logs every request and announces each test as it passes.</li></ol>'+
  '<p class="muted">Full walkthrough with worked examples (IDOR in Repeater, brute force in Intruder, price tampering): see <code>BURP-SUITE-GUIDE.md</code> in the project root.</p></div>';
  return shell('Burp Suite Guide', lab, body);
}

module.exports = { debuggerPage, caseStudyPage, burpPage };
