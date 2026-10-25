<?php
require_once __DIR__ . '/../inc/common.php';
/* page.php — every static page on the site goes through here.
   Usage: page.php?show=about  →  includes pages/about.php
   The developer in 2009 saw no reason to check what "show" contains. */
$show = isset($_GET['show']) ? $_GET['show'] : 'about';
$file = __DIR__ . '/pages/' . $show;
if (substr($file, -4) !== '.php') $file .= '.php';
$PAGE_TITLE = 'Information';
include __DIR__ . '/../inc/header.php';
if (is_file($file)) {
    include $file;
    // the config file carries a canary constant: if it got included, it leaked
    if (defined('BT_LEGACY_MARKER')) rs_pass('lfi');
} else {
    echo '<h1>Page not found</h1><p>That page seems to have been lost in the move.</p>';
}
include __DIR__ . '/../inc/footer.php';
