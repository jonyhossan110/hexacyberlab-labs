<?php
/* Page chrome shared by the Blade layout and the lab pages — one lab bar,
   one app header, exactly like the rest of the platform. */
function layout_head($title){
    $user = current_user();
    $done = rs_done_count(); $total = rs_tests_total();
    $pct = $total ? floor($done / $total * 100) : 0;
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . ' · HexaBilling</title>' .
    '<link rel="stylesheet" href="/assets/style.css"></head><body>' .
    '<div class="labbar"><span>⬢ <b>RS-06 · Real Stack Lab</b> — Laravel-style MVC, Blade-style views</span>' .
    '<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ' . $done . '/' . $total . '</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (' . $pct . '%)</a></span></div>' .
    '<header class="shop"><a class="logo" href="/">⬢ HexaBilling</a><nav>' .
    '<a href="/dashboard">Dashboard</a><a href="/clients">Clients</a><a href="/invoices">Invoices</a>';
    if ($user) echo '<a href="/team">Team</a><a href="/profile">Profile</a><a href="/logout">Logout (' . htmlspecialchars($user['name']) . ')</a>';
    else echo '<a href="/login">Login</a><a href="/register">Register</a>';
    echo '</nav></header><main>';
}
function layout_foot(){
    echo '</main><footer class="foot">HexaBilling — invoicing for freelancers & small firms. A training application; all companies, people and invoices are fictional.</footer></body></html>';
}
