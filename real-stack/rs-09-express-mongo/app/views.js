/* Server-rendered pages. Names and metadata are escaped; post BODIES are
   printed exactly as written — that is this app's stored-XSS flaw, and it
   is deliberate: study postCard() before you judge the developer. */
const { esc } = require('./layout');

function login(next, msg) {
  return `<h1>Welcome back</h1>${msg ? `<p class="err">${esc(msg)}</p>` : ''}` +
    `<form method="post" action="/login" class="form"><label>Email<input name="email" type="text" required></label>` +
    `<label>Password<input name="password" type="password" required></label><button>Log in</button></form>` +
    `<p class="muted">Demo member: felix.wagner@example.de / Berg!pfad8 — or register your own account. (The login API also accepts JSON — the mobile app uses it.)</p>`;
}
function register(msg) {
  return `<h1>Join HexaSocial</h1>${msg ? `<p class="err">${esc(msg)}</p>` : ''}` +
    `<form method="post" action="/register" class="form"><label>Full name<input name="name" required></label>` +
    `<label>Handle<input name="handle" required></label><label>Email<input name="email" type="email" required></label>` +
    `<label>Password<input name="password" type="password" required></label><button>Create account</button></form>`;
}
/* One post card. author is the author's user doc. The body is inserted RAW. */
function postCard(p, author, me) {
  const mine = me && author && author._id === me._id;
  return `<div class="review post"><p class="byline">${author && author.avatar ? `<img class="avatar" src="${esc(author.avatar)}">` : ''}<b>${esc(author ? author.name : 'unknown')}</b> <span class="muted">@${esc(author ? author.handle : '?')} · ${esc(p.created)}${p.visibility === 'private' ? ' · 🔒 private' : ''}</span></p>` +
    `<div class="postbody">${p.body}</div>` +
    `<p class="muted">❤ ${p.likes} like${p.likes === 1 ? '' : 's'} · <a href="/post/${esc(p._id)}">open post</a>${mine ? '' : ` · <form method="post" action="/post/${esc(p._id)}/like" class="inline"><button>Like</button></form>`}</p></div>`;
}
function feed(me, posts, byId, preview) {
  let h = `<section class="hero"><h1>Small circles, honest posts</h1><p>Your feed — public posts from everyone, and all of yours.</p></section>` +
    `<h2>✍ Share something</h2><form method="post" action="/posts" class="form"><label>Post<textarea name="body" required></textarea></label>` +
    `<label>Visibility<select name="visibility"><option value="public">Public</option><option value="private">Private (only me)</option></select></label><button>Post</button></form>` +
    `<h2>🔗 Link preview</h2><form method="post" action="/preview" class="form"><label>URL to preview<input name="url" placeholder="https://example.com/article"></label><button>Fetch preview</button></form>`;
  if (preview) {
    h += preview.ok
      ? `<div class="review"><b>Preview of ${esc(preview.url)}</b><p><b>${esc(preview.title)}</b></p><p class="muted">${esc(preview.snippet)}</p></div>`
      : `<p class="err">Preview failed for ${esc(preview.url)}: ${esc(preview.error)}</p>`;
  }
  h += `<h2>Your feed</h2>`;
  if (!posts.length) h += `<p>No posts yet.</p>`;
  for (const p of posts) h += postCard(p, byId[p.authorId], me);
  return h;
}
function postPage(p, author, me) {
  return `<h1>Post</h1>` + postCard(p, author, me) +
    `<p class="muted">Liked by: ${p.likedBy.length ? p.likedBy.map(id => esc(id)).join(', ') : 'nobody yet'}</p>`;
}
function publicProfile(u, posts, me) {
  let h = `<h1>${u.avatar ? `<img class="avatar big" src="${esc(u.avatar)}"> ` : ''}${esc(u.name)}</h1>` +
    `<p class="muted">@${esc(u.handle)} · ${esc(u.location)} · joined ${esc(u.joined)}${u.website ? ` · <a href="${esc(u.website)}">${esc(u.website)}</a>` : ''}</p>` +
    `<p>${esc(u.bio)}</p><h2>Posts</h2>`;
  if (!posts.length) h += `<p>No posts.</p>`;
  for (const p of posts) {
    if (p.visibility === 'private' && (!me || me._id !== u._id)) {
      // the list view hides the body — but the post link still works…
      h += `<div class="review post"><p class="byline"><b>${esc(u.name)}</b> <span class="muted">🔒 private post</span></p><p class="muted">This post is private.</p><p class="muted"><a href="/post/${esc(p._id)}">open post</a></p></div>`;
    } else h += postCard(p, u, me);
  }
  return h;
}
function profileForm(u, msg) {
  return `<h1>Edit profile</h1>${msg ? `<p class="ok">${esc(msg)}</p>` : ''}` +
    `<form method="post" action="/profile" class="form"><label>Name<input name="name" value="${esc(u.name)}"></label>` +
    `<label>Bio<textarea name="bio">${esc(u.bio)}</textarea></label>` +
    `<label>Location<input name="location" value="${esc(u.location)}"></label>` +
    `<label>Website<input name="website" value="${esc(u.website)}"></label>` +
    `<label>Theme<select name="prefs[theme]"><option ${u.prefs && u.prefs.theme === 'light' ? 'selected' : ''}>light</option><option ${u.prefs && u.prefs.theme === 'dark' ? 'selected' : ''}>dark</option></select></label>` +
    `<button>Save profile</button></form>` +
    `<h2>Profile picture</h2><p class="muted">The mobile API uploads avatars as JSON: <code>POST /profile/avatar</code> with <code>{filename, data}</code> (base64). Files are served back from <code>/uploads/</code>.</p>` +
    (u.avatar ? `<p>Current avatar: <a href="${esc(u.avatar)}">${esc(u.avatar)}</a></p>` : '');
}
function findPage(results, q) {
  let h = `<h1>Find people</h1><form method="get" action="/find" class="form"><label>Name contains<input name="name" value="${esc(q || '')}"></label><button>Search</button></form>`;
  if (results) {
    h += `<p class="muted">${results.length} result(s). The directory API (<code>GET /api/users/find</code>) answers the same query as JSON.</p>`;
    for (const u of results) h += `<div class="review"><b><a href="/user/${esc(u._id)}">${esc(u.name)}</a></b> <span class="muted">@${esc(u.handle)} · ${esc(u.location)}</span><p>${esc(u.bio)}</p><p class="muted">Contact: ${esc(u.email)}</p></div>`;
  }
  return h;
}
module.exports = { login, register, feed, postPage, publicProfile, profileForm, findPage, postCard };
