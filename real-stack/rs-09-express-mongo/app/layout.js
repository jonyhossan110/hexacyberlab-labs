/* Page chrome — the HexaSocial app bar plus the RS lab bar, mirroring RS-01/RS-04. */
const progress = require('./progress');
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function head(title, user) {
  const done = progress.doneCount(), total = progress.TOTAL;
  const pct = total ? Math.floor(done / total * 100) : 0;
  let nav;
  if (user) nav = `<a href="/">Feed</a><a href="/find">Find people</a><a href="/user/${esc(user._id)}">My profile</a><a href="/profile">Edit profile</a><a href="/logout">Logout</a><span class="who">${esc(user.name)}</span>`;
  else nav = `<a href="/login">Login</a><a href="/register">Register</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · HexaSocial</title>` +
    `<link rel="stylesheet" href="/assets/style.css"></head><body>` +
    `<div class="labbar"><span>⬢ <b>RS-09 · Real Stack Lab</b> — Node.js + Express with a Mongo-style store, the way social apps are built</span>` +
    `<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ${done}/${total}</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (${pct}%)</a></span></div>` +
    `<header class="app"><a class="logo" href="/">HexaSocial</a><nav>${nav}</nav></header><main>`;
}
function foot() {
  return `</main><footer class="foot">HexaSocial — a fictional social app in a training lab. Nothing here is real, nobody's posts are real.</footer></body></html>`;
}
module.exports = { esc, head, foot };
