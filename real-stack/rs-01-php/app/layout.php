<?php
function layout_head($title){
    $cfg = require __DIR__ . '/config.php';
    $user = current_user();
    $done = rs_done_count(); $total = rs_tests_total();
    $pct = $total ? floor($done / $total * 100) : 0;
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . ' · NordKart</title>' .
    '<link rel="stylesheet" href="/assets/style.css"></head><body>' .
    '<div class="labbar"><span>⬢ <b>RS-01 · Real Stack Lab</b> — plain PHP, the way real shops are built</span>' .
    '<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ' . $done . '/' . $total . '</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (' . $pct . '%)</a></span></div>' .
    '<header class="shop"><a class="logo" href="/">NordKart</a><nav>' .
    '<a href="/shop">Shop</a>';
    if ($user) echo '<a href="/orders">My Orders</a><a href="/account">Account (€' . number_format($user['balance'], 2) . ')</a><a href="/logout">Logout</a>';
    else echo '<a href="/login">Login</a><a href="/register">Register</a>';
    echo '</nav></header><main>';
}
function layout_foot(){
    echo '</main><footer class="foot">NordKart AS · Org.nr 921 445 102 · Bergen, Norway — a training store. Nothing here is real, no real orders are processed.</footer></body></html>';
}
function money($v){ return '€' . number_format((float)$v, 2); }
