'use strict';
/* HexaCyberLab Gateway — in-lab agent.
   Loaded with: node -r <gateway>/hexa-preload.js server.js   (the gateway does this for you)
   Adds, WITHOUT changing the lab's own code:
   1. Live server console logging (every request, status, timing) to stdout.
   2. Test-pass announcements (watches progress.json for newly passed tests).
   3. A floating Hexa toolbar injected into the lab's HTML pages.
   4. /hexa/debugger, /hexa/case-study, /hexa/burp, /hexa/recent helper routes.
   If anything in here fails, the lab runs exactly as before — this file never breaks a lab. */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const GATEWAY = process.env.HEXA_GATEWAY || 'http://localhost:4000';
const CWD = process.cwd();

function labMeta() {
  if (process.env.HEXA_LAB) { try { return JSON.parse(process.env.HEXA_LAB); } catch (e) {} }
  const meta = { number: '?', name: path.basename(CWD), port: null, classes: [], tests: [] };
  try {
    const src = fs.readFileSync(path.join(CWD, 'server.js'), 'utf8');
    const n = src.match(/LAB_NUMBER\s*=\s*(\d+)/) || src.match(/number:\s*(\d+)/);
    const nm = src.match(/LAB_NAME\s*=\s*'([^']+)'/) || src.match(/name:\s*'([A-Z][A-Za-z0-9]+)'/);
    const p = src.match(/const PORT[^=]*=\s*(?:[^;]*?\|\|\s*)?(\d{4})/) || src.match(/port:\s*(\d{4})/);
    if (n) meta.number = parseInt(n[1], 10);
    if (nm) meta.name = nm[1];
    if (p) meta.port = parseInt(p[1], 10);
    try {
      const idx = JSON.parse(fs.readFileSync(path.join(__dirname, 'lab-index.json'), 'utf8'));
      const mine = idx.labs.find(l => path.basename(l.relPath) === meta.name || l.number === meta.number);
      if (mine) { meta.classes = mine.classes; meta.tests = mine.tests; meta.number = mine.number; meta.name = mine.name; meta.port = mine.port; }
    } catch (e) {}
  } catch (e) {}
  return meta;
}
const LAB = labMeta();
const PROGRESS = path.join(CWD, 'progress.json');
let lastPassed = new Set(), lastMtime = 0;
function readProgress() {
  try {
    const st = fs.statSync(PROGRESS);
    if (st.mtimeMs === lastMtime) return null;
    lastMtime = st.mtimeMs;
    return JSON.parse(fs.readFileSync(PROGRESS, 'utf8'));
  } catch (e) { return null; }
}
function testName(id) { const t = (LAB.tests || []).find(t => t.id === id); return t ? t.name : id; }
function checkPasses(announce) {
  const pr = readProgress(); if (!pr || !pr.tests) return;
  const now = new Set(Object.keys(pr.tests).filter(k => pr.tests[k]));
  for (const id of now) if (!lastPassed.has(id)) {
    if (announce) {
      const done = now.size, total = (LAB.tests || []).length || done;
      console.log('  ★ TEST PASSED — ' + testName(id) + ' (' + id + ') · progress ' + done + '/' + total + (total ? ' (' + Math.floor(done / total * 100) + '%)' : ''));
    }
  }
  lastPassed = now;
}
checkPasses(false);

const recent = [];
function ts() { return new Date().toTimeString().slice(0, 8); }

let pages = null;
try { pages = require(path.join(__dirname, 'hexa-pages.js')); } catch (e) {}

const TOOLBAR = '<div id="hexa-toolbar" style="position:fixed;left:14px;bottom:14px;z-index:9999;background:#1d2333;border:1px solid #46538a;border-radius:30px;padding:7px 10px;font-family:Arial,sans-serif;font-size:13px;box-shadow:0 6px 24px rgba(0,0,0,.35);display:flex;gap:4px">' +
  '<a target="_blank" rel="noopener" href="' + GATEWAY + '/terminal?lab=' + (LAB.port || '') + '" style="color:#e8ebf4;text-decoration:none;padding:4px 9px;border-radius:20px">🖥 Terminal</a>' +
  '<a href="/hexa/debugger" style="color:#e8ebf4;text-decoration:none;padding:4px 9px;border-radius:20px">🐛 Debugger</a>' +
  '<a href="/hexa/case-study" style="color:#e8ebf4;text-decoration:none;padding:4px 9px;border-radius:20px">📖 Real Case</a>' +
  '<a href="/hexa/burp" style="color:#e8ebf4;text-decoration:none;padding:4px 9px;border-radius:20px">🧰 Burp</a>' +
  '<a target="_blank" rel="noopener" href="' + GATEWAY + '" style="color:#9fc1ff;text-decoration:none;padding:4px 9px;border-radius:20px">🎛 Dashboard</a></div>';

/* On a lab's /complete page: a "Copy report (Markdown)" button. It converts the
   rendered completion report (headings, lists, paragraphs, tables, code) into
   clean Markdown in the browser and copies it — ready to paste into a pentest
   report, a README, or a client email. Runs fully client-side. */
const REPORT_UI = '<button id="hexa-copy-report" style="position:fixed;right:14px;top:14px;z-index:9999;background:#6c5cff;color:#fff;border:0;border-radius:24px;padding:10px 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;cursor:pointer;box-shadow:0 6px 24px rgba(0,0,0,.35)">📋 Copy report (Markdown)</button>' +
'<script>(function(){function txt(el){return (el.textContent||"").replace(/\\s+/g," ").trim();}function conv(node,d){var out="";node.childNodes.forEach(function(n){if(n.nodeType===3){var t=n.textContent.replace(/\\s+/g," ");if(t.trim())out+=t;}else if(n.nodeType===1){var tag=n.tagName.toLowerCase();if(tag==="script"||tag==="style"||n.id==="hexa-toolbar"||n.id==="hexa-copy-report")return;if(tag==="h1")out+="\\n\\n# "+txt(n)+"\\n";else if(tag==="h2")out+="\\n\\n## "+txt(n)+"\\n";else if(tag==="h3")out+="\\n\\n### "+txt(n)+"\\n";else if(tag==="h4")out+="\\n\\n#### "+txt(n)+"\\n";else if(tag==="li")out+="\\n- "+conv(n,d+1).replace(/\\n+/g," ").trim();else if(tag==="tr"){var cells=[];n.querySelectorAll("th,td").forEach(function(c){cells.push(txt(c));});if(cells.length)out+="\\n| "+cells.join(" | ")+" |";}else if(tag==="pre")out+="\\n\\n```\\n"+n.textContent.trim()+"\\n```\\n";else if(tag==="code")out+=" `"+txt(n)+"` ";else if(tag==="br")out+="\\n";else if(tag==="p"||tag==="div"||tag==="section"||tag==="article")out+="\\n"+conv(n,d+1)+"\\n";else out+=conv(n,d+1);}});return out;}var btn=document.getElementById("hexa-copy-report");if(btn)btn.addEventListener("click",async function(){var main=document.querySelector("main")||document.body;var md=conv(main,0).replace(/\\n{3,}/g,"\\n\\n").trim()+"\\n";try{await navigator.clipboard.writeText(md);btn.textContent="✓ Copied — paste it anywhere";}catch(e){var ta=document.createElement("textarea");ta.value=md;document.body.appendChild(ta);ta.select();try{document.execCommand("copy");btn.textContent="✓ Copied — paste it anywhere";}catch(e2){btn.textContent="Copy failed — select the page text manually";}ta.remove();}setTimeout(function(){btn.textContent="📋 Copy report (Markdown)";},2600);});})();</' + 'script>';

const origCreate = http.createServer;
http.createServer = function (...args) {
  const handler = args.find(a => typeof a === 'function');
  const rest = args.filter(a => typeof a !== 'function');
  const wrapped = function (req, res) {
    try {
      const u = new URL(req.url, 'http://localhost');
      const pathname = u.pathname;
      if (pages && pathname.startsWith('/hexa/')) {
        const sendHtml = (html) => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); };
        if (pathname === '/hexa/debugger') return sendHtml(pages.debuggerPage(LAB));
        if (pathname === '/hexa/case-study') return sendHtml(pages.caseStudyPage(LAB));
        if (pathname === '/hexa/burp') return sendHtml(pages.burpPage(LAB));
        if (pathname === '/hexa/recent') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ items: recent })); }
      }
      const t0 = Date.now();
      // capture request body without disturbing the lab's own reading
      const chunks = [];
      req.on('data', c => { try { if (Buffer.concat(chunks).length < 8192) chunks.push(c); } catch (e) {} });
      // toolbar injection: buffer HTML responses
      const origWrite = res.write.bind(res), origEnd = res.end.bind(res);
      const parts = []; let decided = null;
      const origWriteHead = res.writeHead.bind(res);
      res.writeHead = function (code, ...a) {
        const hi = a.findIndex(x => x && typeof x === 'object');
        let ct = null;
        if (hi >= 0) { const hdrs = a[hi];
          if (Array.isArray(hdrs)) { for (let i = 0; i < hdrs.length; i += 2) if (String(hdrs[i]).toLowerCase() === 'content-type') ct = hdrs[i + 1]; }
          else for (const k of Object.keys(hdrs)) if (k.toLowerCase() === 'content-type') ct = hdrs[k];
        }
        if (!ct && res.getHeader) ct = res.getHeader('content-type');
        if (decided === null) decided = ct ? String(ct).includes('text/html') : false;
        if (decided && hi >= 0) { const hdrs = a[hi];
          if (Array.isArray(hdrs)) a[hi] = hdrs.filter((v, i) => !(i % 2 === 0 && String(v).toLowerCase() === 'content-length'));
          else { const c = { ...hdrs }; for (const k of Object.keys(c)) if (k.toLowerCase() === 'content-length') delete c[k]; a[hi] = c; }
        }
        return origWriteHead(code, ...a);
      };
      const isHtml = () => { const ct = res.getHeader && res.getHeader('content-type'); return ct ? String(ct).includes('text/html') : false; };
      res.write = function (chunk, ...a) { if (decided === null) decided = isHtml(); if (decided) { if (chunk) parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))); return true; } return origWrite(chunk, ...a); };
      res.end = function (chunk, ...a) {
        if (decided === null) decided = isHtml();
        if (decided) {
          if (chunk) parts.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          let body = Buffer.concat(parts).toString('utf8');
          if (body.includes('</body>') && !body.includes('hexa-toolbar')) body = body.replace('</body>', TOOLBAR + (pathname === '/complete' ? REPORT_UI : '') + '</body>');
          try { res.removeHeader('content-length'); } catch (e) {}
          return origEnd(body, ...a);
        }
        return origEnd(chunk, ...a);
      };
      res.on('finish', () => {
        const ms = Date.now() - t0;
        console.log(ts() + ' › ' + req.method + ' ' + req.url + ' → ' + res.statusCode + ' (' + ms + ' ms)');
        const body = Buffer.concat(chunks).toString('utf8');
        if (body || u.search) recent.unshift({ time: ts(), method: req.method, path: pathname, query: u.search ? decodeURIComponent(u.search.slice(1)).slice(0, 600) : '', body: body.slice(0, 600), status: res.statusCode });
        if (recent.length > 15) recent.pop();
        checkPasses(true);
      });
    } catch (e) { /* never break the lab */ }
    return handler(req, res);
  };
  return origCreate(...(handler ? [wrapped, ...rest] : args));
};
console.log('⬢ Hexa gateway agent active — LAB ' + LAB.number + ' ' + LAB.name + ' · live console + toolbar + /hexa tools');
