'use strict';
/* HexaCyberLab Payload Debugger — "Why did your payload not work?"
   Shared analyzer: runs in the browser (window.HexaAnalyzer) and in Node.
   It diagnoses a payload the way a mentor would: what the server likely saw,
   where the syntax broke, what a filter probably did, and what to try next.
   It NEVER prints a ready-made solution payload — direction, not answers. */
(function (root) {
  function count(s, ch) { return (s.match(new RegExp('\\' + ch, 'g')) || []).length; }
  function has(s, re) { return re.test(s); }

  function analyzeSqli(p, out) {
    const quotes = count(p, "'");
    if (quotes % 2 === 1) out.push(['error', "Your quote breaks here: you opened " + quotes + " single quote(s) — an odd number. The string never closes, so the database throws a syntax error instead of running your logic. Balance the quotes first."]);
    if (!/'|"|--|#|\/\*/.test(p)) out.push(['tip', "No quote, comment or escape character at all — this reads as plain text to the query. Injection starts by breaking out of the string the developer wrapped around your input."]);
    if (/'\s*(or|and)\s+/i.test(p) && !/(--|#|\/\*)/.test(p)) out.push(['tip', "You built a boolean condition but never closed the rest of the original query. Without a comment sequence (-- or #) the leftover SQL after your input usually breaks the syntax."]);
    if (/union/i.test(p) && /select/i.test(p)) {
      if (/unionselect/i.test(p.replace(/\s+/g, '')) && !/union\s+select/i.test(p)) out.push(['error', "Your keywords are glued together (UNIONSELECT). A filter may have stripped the spaces/keywords once — a classic sign of a naive keyword filter."]);
      out.push(['info', "UNION SELECT only works when your SELECT returns the same number of columns as the original query. If it errored, vary the column count (NULL placeholders) until the error changes."]);
    }
    if (/%27|%22/.test(p)) out.push(['info', "Your payload is URL-encoded (' becomes %27). One decode happens in transit — if the app decodes again, or never did, the quote the database sees may not be the one you sent. Compare raw vs encoded attempts."]);
    if (!out.length) out.push(['info', "The payload's shape looks syntactically plausible for SQL injection. If it still failed, the flaw may live in a different field or endpoint than the one you are testing — check which parameter the lab's test actually watches."]);
  }

  function analyzeXss(p, out) {
    if (!/[<>]/.test(p)) out.push(['error', "No angle brackets at all — plain text can be displayed, but it can never execute. An XSS payload needs markup (a tag) or a way to break out of an existing attribute."]);
    if (/&lt;|&gt;/.test(p)) out.push(['error', "Your payload contains &lt; / &gt; — it was HTML-entity-encoded before or during submission, so the browser renders it as harmless text. The encoding happened somewhere: your tool, the form, or the app. Find where, and send the raw characters."]);
    if (/%3c|%3e/i.test(p)) out.push(['info', "Your angle brackets are URL-encoded (%3C). If the app reflects the value without decoding, the browser sees text, not a tag. Try sending raw < > — and if raw works but encoded does not, you just learned how this app handles encoding."]);
    if (/<script/i.test(p)) out.push(['tip', "You used a <script> tag — the first thing most filters and frameworks block or strip. If it vanished from the response, this filter eats script tags: think in event handlers and other elements (<svg>, <img>, <details>) instead."]);
    if (/<[a-z]+[^>]*$/i.test(p) && /</i.test(p)) out.push(['error', "Your tag never closes — no final '>'. Browsers discard the broken tag, so nothing runs."]);
    if (/on\w+\s*=/i.test(p) && !/</i.test(p)) out.push(['tip', "An event handler (onerror=, onload=…) does nothing on its own — it must live inside a tag. Attach it to an element that fires it."]);
    if (/javascript:/i.test(p) && !/<a\b/i.test(p)) out.push(['info', "A javascript: URL only executes inside a clickable link context. Outside an <a href>, browsers ignore it."]);
    if (!out.length) out.push(['info', "Structurally this looks like a live XSS attempt. If nothing fired, check WHERE it landed in the page source: inside a <script> block, an attribute, or a comment needs a different escape than plain HTML body context."]);
  }

  function analyzeTraversal(p, out) {
    if (!/(\.\.|%2e|\\|\/)/i.test(p)) out.push(['tip', "No traversal sequence at all — you asked for the file by its plain name, which the app happily serves from its own folder. Traversal means climbing OUT of that folder first."]);
    if (/\.\.\\/.test(p)) out.push(['info', "You used Windows separators (..\\). This app runs on Node — forward slashes (../) are the reliable form here."]);
    if (/%2e%2e/i.test(p)) out.push(['info', "Encoded dots (%2e%2e). If the server decodes once, this becomes ../ — good. If it decodes twice or the framework normalises the path first, it may collapse. Compare with the plain ../ form to learn which."]);
    if (/\.\.\//.test(p) && count(p, '..') < 3) out.push(['tip', "Only " + count(p, '..') + " level(s) up. If the target file sits deeper than that below the served folder, you land in the wrong directory and get a bland 404. Climb more."]);
  }

  function analyzeSsrf(p, out) {
    if (!/https?:\/\//i.test(p) && !/\d+\.\d+\.\d+\.\d+/.test(p)) out.push(['tip', "No URL or IP in the payload — an SSRF attempt must give the server somewhere to fetch. What internal address would this server trust?"]);
    if (/169\.254\.169\.254/.test(p)) out.push(['info', "You aimed at the cloud metadata address. That is the right instinct for cloud SSRF — but this lab runs locally, so the interesting 'internal' targets are the server's own loopback services and admin endpoints."]);
    if (/localhost/i.test(p)) out.push(['info', "You used the name 'localhost'. Some filters block the name but not the number: 127.0.0.1, 0.0.0.0, or [::1] can reach the same place. If one form is blocked and another is not, you found the filter's shape."]);
  }

  function analyzeJwt(p, out) {
    const parts = p.trim().split('.');
    if (parts.length !== 3) { out.push(['error', "This is not JWT-shaped: a token has 3 dot-separated parts (header.payload.signature) — yours has " + parts.length + "."]); return; }
    try {
      let b64 = parts[0].replace(/-/g, '+').replace(/_/g, '/'); while (b64.length % 4) b64 += '=';
      const raw = (typeof Buffer !== 'undefined') ? Buffer.from(b64, 'base64').toString('utf8') : decodeURIComponent(escape(atob(b64)));
      const hdr = JSON.parse(raw);
      out.push(['info', "Header decodes to: " + JSON.stringify(hdr) + (String(hdr.alg).toLowerCase() === 'none' ? " — alg is already 'none'." : " — the algorithm is '" + hdr.alg + "'.")]);
      if (String(hdr.alg).toLowerCase() !== 'none') out.push(['tip', "If this server forgets to verify, the classic tests are the algorithm field and whether the signature is checked at all. Remember: editing the payload while keeping the old signature only works when the server does not truly verify."]);
    } catch (e) { out.push(['error', "The first segment does not base64url-decode to JSON — the header is malformed, so every server will reject it before any flaw is tested."]); }
    if (!parts[2]) out.push(['info', "The signature segment is empty. That pairs with alg=none — some servers accept it, strict ones never do."]);
  }

  function analyzeUpload(p, out) {
    const name = p.split(/[/\\]/).pop();
    if (/\.(php|jsp|asp|aspx|exe|sh)$/i.test(name)) out.push(['tip', "A direct executable extension (" + name.split('.').pop() + "). If the upload 'succeeded' but nothing executed, the server may store files somewhere non-executable — the flaw to find is the gap between what the filter checks (name? type? content?) and what the server trusts."]);
    if (/\.(php|jsp|asp)\./i.test(name)) out.push(['info', "Double extension spotted. Whether that fools the server depends on how it parses the name — some stacks take the first extension, some the last, some the filter and server disagree (that disagreement IS the bug)."]);
    if (!/\./.test(name)) out.push(['error', "No extension in the filename at all — most upload filters reject or rename it, and the server cannot decide how to serve it."]);
  }

  function analyzeLogic(p, out) {
    const nums = p.match(/-?\d+(\.\d+)?/g) || [];
    if (nums.some(n => parseFloat(n) < 0)) out.push(['info', "You sent a negative number. If the server accepted the request but the test did not pass, the watched flaw may be a different field (price vs quantity vs discount) — or the total is recalculated server-side while another value is trusted."]);
    else if (nums.some(n => parseFloat(n) === 0)) out.push(['info', "A zero value — good instinct. Some flows reject 0 at the form layer but accept it via the raw API request. Tools (Repeater/curl) bypass form validation; the browser form does not."]);
    else out.push(['tip', "No obviously tampered number found. Business-logic flaws hide in values the UI would never let you type: negative quantities, tiny prices, huge discounts, skipped steps. Send the request with a tool so you control every field, not the form."]);
  }

  function analyzeGeneric(p, cls, out) {
    const chars = [];
    if (/'/.test(p)) chars.push("single quote '");
    if (/"/.test(p)) chars.push('double quote "');
    if (/</.test(p)) chars.push('<');
    if (/>/.test(p)) chars.push('>');
    if (/;/.test(p)) chars.push('semicolon ;');
    if (/\|/.test(p)) chars.push('pipe |');
    if (/`/.test(p)) chars.push('backtick `');
    if (/\$\{/.test(p)) chars.push('template ${ }');
    if (chars.length) out.push(['info', "Special characters present: " + chars.join(', ') + ". Each one is a lever — the question is which parser (SQL, HTML, shell, template) receives it."]);
    if (p.length > 0 && p.length < 4) out.push(['tip', "Very short payload. One character can prove a flaw (a lone quote that errors), but a full test usually needs the character plus a condition plus a way to close the original syntax."]);
    if (!out.length) out.push(['info', "Nothing structurally wrong that I can see. Then the failure is probably about TARGET, not payload: wrong field, wrong endpoint, or the app needs a logged-in session / different role for the flaw to trigger."]);
  }

  const BY_CLASS = { 'sqli': analyzeSqli, 'xss': analyzeXss, 'path-traversal': analyzeTraversal, 'file-upload': analyzeUpload, 'ssrf': analyzeSsrf, 'jwt': analyzeJwt, 'business-logic': analyzeLogic, 'race-condition': analyzeLogic };

  function analyze(payload, cls) {
    const p = String(payload == null ? '' : payload);
    const out = [];
    if (!p.trim()) return [['error', "No payload to analyse — paste the exact value you submitted (from the form, Burp, or your terminal) and I will take it apart."]];
    (BY_CLASS[cls] || analyzeGeneric)(p, out);
    analyzeGeneric(p, cls, out);
    const seen = new Set(), dedup = [];
    for (const f of out) { if (!seen.has(f[1])) { seen.add(f[1]); dedup.push(f); } }
    return dedup.slice(0, 5);
  }

  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.HexaAnalyzer = api;
})(typeof window !== 'undefined' ? window : globalThis);
