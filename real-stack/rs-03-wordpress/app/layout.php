<?php
function layout_head($title){
    $cfg = require __DIR__ . '/config.php';
    $user = current_user();
    $done = rs_done_count(); $total = rs_tests_total();
    $pct = $total ? floor($done / $total * 100) : 0;
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . ' · WanderPress</title>' .
    '<meta name="generator" content="HexaPress ' . $cfg['version'] . '">' .
    '<link rel="stylesheet" href="/assets/style.css"></head><body>' .
    '<div class="labbar"><span>⬢ <b>RS-03 · Real Stack Lab</b> — WordPress-style PHP: a small core, and plugins where the trouble lives</span>' .
    '<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ' . $done . '/' . $total . '</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (' . $pct . '%)</a></span></div>' .
    '<header class="shop"><a class="logo" href="/">WanderPress</a><nav>' .
    '<a href="/">Home</a><a href="/gallery">Gallery</a><a href="/contact">Contact</a>';
    if ($user) echo '<a href="/wp-admin">Dashboard</a><a href="/profile">Profile (' . htmlspecialchars($user['role']) . ')</a><a href="/logout">Log out</a>';
    else echo '<a href="/wp-login.php">Log in</a><a href="/register">Register</a>';
    echo '</nav></header><main>';
}
function layout_foot(){
    echo '</main><footer class="foot">WanderPress · Slow travel, honest stories — published from a small desk in Lisbon. A training site running HexaPress (WordPress-style); nothing here is real.</footer></body></html>';
}
