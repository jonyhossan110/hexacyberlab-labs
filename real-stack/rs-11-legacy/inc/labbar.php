<?php
/* The HexaCyberLab lab bar — shown above both the legacy site and lab pages. */
function lab_bar(){
    $done = rs_done_count(); $total = rs_tests_total();
    $pct = $total ? floor($done / $total * 100) : 0;
    echo '<div class="labbar"><span>⬢ <b>RS-11 · Real Stack Capstone</b> — a legacy PHP audit, end to end</span>' .
    '<span><a href="/lab/brief">📋 Brief</a><a href="/lab/tests">🎯 Tests ' . $done . '/' . $total . '</a><a href="/lab/guide">📖 Guide</a><a href="/lab/review">🔍 Code Review</a><a href="/lab/logs">🛡 Logs</a><a href="/lab/complete">🏁 Complete (' . $pct . '%)</a></span></div>';
}
