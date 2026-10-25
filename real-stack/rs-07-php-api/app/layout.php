<?php
function layout_head($title){
    $user = current_user();
    $done = rs_done_count(); $total = rs_tests_total();
    $pct = $total ? floor($done / $total * 100) : 0;
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . ' · HexaPay</title>' .
    '<link rel="stylesheet" href="/assets/style.css"></head><body>' .
    '<div class="labbar"><span>⬢ <b>RS-07 · Real Stack Lab</b> — a PHP REST API, bearer tokens and all</span>' .
    '<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ' . $done . '/' . $total . '</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (' . $pct . '%)</a></span></div>' .
    '<header class="shop"><a class="logo" href="/">HexaPay</a><nav>' .
    '<a href="/">API</a><a href="/dashboard">Dashboard</a>';
    if ($user) echo '<a href="/logout">Logout</a>';
    else echo '<a href="/login">Login</a><a href="/register">Register</a>';
    echo '</nav></header><main>';
}
function layout_foot(){
    echo '</main><footer class="foot">HexaPay Ltd · Registered in England &amp; Wales No. 09114482 · London — a training API. Nothing here is real, no real money moves.</footer></body></html>';
}
function money($v){ return '€' . number_format((float)$v, 2); }
