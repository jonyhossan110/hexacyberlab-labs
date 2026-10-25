/* Server-side templates — plain functions returning HTML strings, the way
   this app was written before anyone adopted a template engine.
   Remember: ticket comment bodies are rendered RAW (see renderTicket) —
   that is one of this lab's flaws, kept exactly where the developer left it. */
const { esc } = require('./layout');

function dashboard(user, ws, counts, token) {
  return `<section class="hero"><h1>Hei, ${esc(user.name.split(' ')[0])} 👋</h1>` +
    `<p>${esc(ws.name)} · plan: <b>${esc(user.plan)}</b> · your role: <b>${esc(user.role)}</b> · wallet: <b>${user.credits} credits</b></p></section>` +
    `<div class="grid">` +
    `<a class="card" href="/projects"><h3>🗂 Projects</h3><p>${counts.projects} projects in this workspace</p></a>` +
    `<a class="card" href="/tickets"><h3>🎫 Tickets</h3><p>${counts.tickets} tickets to work on</p></a>` +
    `<a class="card" href="/billing"><h3>💳 Billing</h3><p>Redeem the WELCOME50 coupon, top up credits</p></a>` +
    `<a class="card" href="/download?file=onboarding-guide.txt"><h3>📄 Onboarding guide</h3><p>The PDF-less guide every new agent reads</p></a>` +
    `</div>` +
    `<h2>API access</h2><p class="muted">The HexaDesk API authenticates with a JSON Web Token. Yours (keep it safe — it is you, as far as the API knows):</p>` +
    `<pre class="src">${esc(token)}</pre>` +
    `<p class="muted">Try it: <code>curl -H "Authorization: Bearer &lt;token&gt;" http://localhost:3204/api/me</code> — admins can also call <code>/api/admin/users</code>.</p>`;
}
function projects(list) {
  let h = `<h1>Projects</h1><div class="grid">`;
  for (const p of list) h += `<a class="card" href="/projects/${p.id}"><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><b>${esc(p.status)}</b></a>`;
  return h + `</div>`;
}
function project(p, tickets) {
  let h = `<h1>${esc(p.name)}</h1><p>${esc(p.description)}</p><p class="muted">Status: ${esc(p.status)} · project #${p.id}</p><h2>Tickets in this project</h2>`;
  if (!tickets.length) h += `<p>No tickets yet.</p>`;
  for (const t of tickets) h += `<div class="review"><b><a href="/tickets/${t.id}">${esc(t.title)}</a></b><p class="muted">${esc(t.status)} · ${esc(t.priority)}</p></div>`;
  return h;
}
function tickets(list) {
  let h = `<h1>Tickets</h1>`;
  for (const t of list) h += `<div class="review"><b><a href="/tickets/${t.id}">${esc(t.title)}</a></b><p class="muted">#${t.id} · ${esc(t.status)} · ${esc(t.priority)} priority</p></div>`;
  return h;
}
function ticket(t, comments, preview) {
  let h = `<h1>${esc(t.title)}</h1><p>${esc(t.body)}</p><p class="muted">Ticket #${t.id} · ${esc(t.status)} · ${esc(t.priority)} priority</p>` +
    `<h2>Comments</h2>`;
  for (const c of comments) {
    /* VULNERABLE ON PURPOSE: comment bodies are printed raw, exactly as stored */
    h += `<div class="review"><b>${esc(c.author)}</b> <span class="muted">${esc(c.created)}</span><p>${c.body}</p></div>`;
  }
  h += `<form method="post" action="/tickets/${t.id}/comments" class="form"><label>Add a comment<textarea name="body" required></textarea></label><button>Post comment</button></form>` +
    `<h2>🔗 Link preview</h2><p class="muted">Paste a link and HexaDesk fetches a preview for the team — status pages, docs, anything.</p>` +
    `<form method="post" action="/tickets/${t.id}/preview" class="form"><label>URL<input name="url" placeholder="https://status.example.com/incident-42" required></label><button>Fetch preview</button></form>`;
  if (preview) h += preview.ok
    ? `<div class="review"><b>Preview of ${esc(preview.url)}</b><p>${esc(preview.title)}</p><p class="muted">${esc(preview.snippet)}</p></div>`
    : `<p class="err">Could not fetch that URL: ${esc(preview.error)}</p>`;
  return h;
}
function profile(user, msg) {
  return `<h1>Your profile</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}` +
    `<p class="muted">${esc(user.email)} · role: <b>${esc(user.role)}</b> · plan: <b>${esc(user.plan)}</b> · credits: <b>${user.credits}</b></p>` +
    `<form method="post" class="form"><label>Display name<input name="name" value="${esc(user.name)}"></label>` +
    `<label>Job title<input name="title" value="${esc(user.title)}"></label><button>Save profile</button></form>`;
}
function settings(ws, user, msg) {
  return `<h1>Workspace settings</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}` +
    `<p class="muted">Applies to everyone in <b>${esc(ws.name)}</b>. Signed in as ${esc(user.email)}.</p>` +
    `<form method="post" class="form"><label>Workspace name<input name="name" value="${esc(ws.name)}"></label>` +
    `<label>Support email<input name="support_email" value="${esc(ws.support_email)}"></label>` +
    `<label>Timezone<input name="timezone" value="${esc(ws.timezone)}"></label><button>Save settings</button></form>`;
}
function billing(user, msg) {
  return `<h1>Billing</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}` +
    `<p>Current plan: <b>${esc(user.plan)}</b> · credit balance: <b>${user.credits}</b></p>` +
    `<h2>Redeem a coupon</h2><form method="post" action="/billing/redeem" class="form">` +
    `<label>Coupon code<input name="code" placeholder="WELCOME50"></label><button>Redeem</button></form>` +
    `<p class="muted">WELCOME50 gives 50 credits, once per account. The redemption talks to a slow payment gateway — be patient after clicking.</p>`;
}
function login(next, msg) {
  return `<h1>Log in to HexaDesk</h1>${msg ? `<p class="err">${esc(msg)}</p>` : ''}` +
    `<form method="post" class="form"><input type="hidden" name="next" value="${esc(next || '/')}">` +
    `<label>Email<input name="email" type="text" required></label>` +
    `<label>Password<input name="password" type="password" required></label><button>Log in</button></form>` +
    `<p class="muted">Demo agent: priya.nair@northwind.example / Monsoon!Tea4 — or register your own account.</p>`;
}
function register(msg) {
  return `<h1>Create your HexaDesk account</h1>${msg ? `<p class="err">${esc(msg)}</p>` : ''}` +
    `<form method="post" class="form"><label>Full name<input name="name" required></label>` +
    `<label>Email<input name="email" type="email" required></label>` +
    `<label>Password<input name="password" type="password" required></label><button>Register</button></form>` +
    `<p class="muted">New accounts join the Northwind Traders workspace as agents with 100 welcome credits.</p>`;
}
module.exports = { dashboard, projects, project, tickets, ticket, profile, settings, billing, login, register };
