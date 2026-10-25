<?php
layout_head('HexaPay API');
echo '<section class="hero"><h1>Payments and wallets, one API call away</h1>' .
'<p>HexaPay is the API behind a thousand small apps: accounts, balances, instant transfers, OTP verification and webhooks. This page is the human door — the real product is the JSON underneath.</p>' .
'<p><a class="btn" href="/register">Get an API token</a> <a class="btn ghost" href="/dashboard">Open the dashboard</a></p></section>' .
'<h2>Start in 30 seconds</h2><pre class="code"># 1. log in, get a token
curl -s -X POST localhost:3207/api/login \
  -H "Content-Type: application/json" \
  -d \'{"email":"priya.nair@example.in","password":"Monsoon!24"}\'

# 2. call the API with it
curl -s localhost:3207/api/me -H "Authorization: Bearer hp_…"</pre>' .
'<h2>Endpoint map</h2><table class="map">' .
'<tr><th>Method &amp; path</th><th>What it does</th></tr>' .
'<tr><td><code>POST /api/register</code></td><td>Create a user + wallet (€250 bonus), returns a token</td></tr>' .
'<tr><td><code>POST /api/login</code></td><td>Exchange email + password for a bearer token</td></tr>' .
'<tr><td><code>GET /api/me</code> · <code>PATCH /api/me</code></td><td>Read / update your profile</td></tr>' .
'<tr><td><code>GET /api/users</code> · <code>GET /api/users/{id}</code></td><td>The user directory (for paying contacts)</td></tr>' .
'<tr><td><code>GET /api/accounts/{id}</code></td><td>One wallet: owner, label, balance</td></tr>' .
'<tr><td><code>GET /api/transactions?filter=&amp;sort=</code></td><td>Search your money movements</td></tr>' .
'<tr><td><code>POST /api/transfers</code></td><td>Send money now — or <code>{"mode":"authorize"}</code> to hold it for capture</td></tr>' .
'<tr><td><code>POST /api/transfers/{id}/capture</code></td><td>Capture an authorized transfer</td></tr>' .
'<tr><td><code>POST /api/otp/request</code> · <code>POST /api/otp/verify</code></td><td>Phone verification by 4-digit SMS code</td></tr>' .
'<tr><td><code>POST /api/webhooks</code> · <code>POST /api/webhooks/{id}/ping</code></td><td>Register a webhook URL and test-ping it</td></tr>' .
'</table>' .
'<p class="muted">Seeded demo user: priya.nair@example.in / Monsoon!24 — or register your own. Balances are play money; the flaws, unfortunately for HexaPay, are realistic.</p>';
layout_foot();
