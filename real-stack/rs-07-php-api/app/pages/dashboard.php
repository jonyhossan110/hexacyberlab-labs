<?php
require_login();
$u = current_user();
$acct = hp_account_of($u['id']);
layout_head('Dashboard');
// The welcome line prints the display name exactly as the API stored it.
// The name is data when it arrives over JSON — and markup when it lands here.
echo '<h1>Welcome back, ' . $u['name'] . '</h1>' .
'<p>' . htmlspecialchars($u['email']) . ' · role: ' . htmlspecialchars($u['role']) . ' · phone ' . ($u['phone_verified'] ? 'verified ✓' : 'not verified') . '</p>' .
'<div class="balance"><span>Wallet balance</span><b>' . money($acct['balance']) . '</b><small>Account #' . $acct['id'] . ' · ' . htmlspecialchars($acct['label']) . '</small></div>';
$tx = db()->prepare("SELECT * FROM transactions WHERE from_account = ? OR to_account = ? ORDER BY id DESC LIMIT 8");
$tx->execute([$acct['id'], $acct['id']]);
echo '<h2>Recent activity</h2>';
foreach ($tx->fetchAll(PDO::FETCH_ASSOC) as $t) {
    $dir = (int)$t['from_account'] === (int)$acct['id'] ? '→ sent' : '← received';
    echo '<div class="review"><b>' . $dir . ' ' . money($t['amount']) . '</b> — ' . htmlspecialchars($t['note']) . ' <span class="muted">' . $t['created'] . '</span></div>';
}
echo '<h2>Pay a contact</h2><p class="muted">Everyone on HexaPay — display names come straight from the API.</p>';
foreach (db()->query("SELECT id, name, email FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC) as $c) {
    // contact names are printed raw, same as the welcome line
    echo '<div class="review"><b>' . $c['name'] . '</b> <span class="muted">' . htmlspecialchars($c['email']) . ' · account #' . $c['id'] . '</span></div>';
}
echo '<h2>Your API session (live from /api/me)</h2><pre class="log" id="apiout">calling the API…</pre>' .
'<script>
var m = document.cookie.match(/hp_token=([^;]+)/);
if (m) {
  fetch("/api/me", {headers: {"Authorization": "Bearer " + decodeURIComponent(m[1])}})
    .then(function(r){ return r.text(); })
    .then(function(t){ document.getElementById("apiout").textContent = t; })
    .catch(function(e){ document.getElementById("apiout").textContent = "API call failed: " + e; });
} else {
  document.getElementById("apiout").textContent = "no token cookie";
}
</script>';
layout_foot();
