<?php
/* Chrome for the lab pages (brief/tests/guide/review/logs/complete). */
require_once __DIR__ . '/labbar.php';
function lab_head($title){
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' . htmlspecialchars($title) . ' · RS-11 BrightTravel Audit</title>' .
    '<link rel="stylesheet" href="/assets/style.css"></head><body>';
    lab_bar();
    echo '<header class="shop"><a class="logo" href="/">BrightTravel</a><nav><a href="/index.php">Site home</a><a href="/admin.php">Admin panel</a></nav></header><main>';
}
function lab_foot(){
    echo '</main><footer class="foot">RS-11 — a training audit. BrightTravel is fictional; every flaw in it is deliberate and scored.</footer></body></html>';
}
