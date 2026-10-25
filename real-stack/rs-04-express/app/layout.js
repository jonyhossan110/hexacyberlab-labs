/* Page chrome — the HexaDesk app bar plus the RS lab bar, mirroring RS-01. */
const progress = require('./progress');
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function head(title, user) {
  const done = progress.doneCount(), total = progress.TOTAL;
  const pct = total ? Math.floor(done / total * 100) : 0;
  let nav;
  if (user) nav = `<a href="/">Dashboard</a><a href="/projects">Projects</a><a href="/tickets">Tickets</a><a href="/billing">Billing (${user.credits} credits)</a><a href="/profile">Profile</a><a href="/settings">Settings</a><a href="/logout">Logout</a>`;
  else nav = `<a href="/login">Login</a><a href="/register">Register</a>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)} · HexaDesk</title>` +
    `<link rel="stylesheet" href="/assets/style.css"></head><body>` +
    `<div class="labbar"><span>⬢ <b>RS-04 · Real Stack Lab</b> — Node.js + Express, the way real SaaS apps are built</span>` +
    `<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ${done}/${total}</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (${pct}%)</a></span></div>` +
    `<header class="app"><a class="logo" href="/">HexaDesk</a><nav>${nav}</nav></header><main>`;
}
function foot() {
  return `</main><footer class="foot">HexaDesk Inc — a fictional SaaS company in a training lab. Nothing here is real, no real tickets exist.</footer></body></html>`;
}
module.exports = { esc, head, foot };
