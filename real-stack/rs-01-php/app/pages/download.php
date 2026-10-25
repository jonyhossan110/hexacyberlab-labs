<?php
require_login();
$file = $_GET['file'] ?? '';
$base = LAB_ROOT . '/files';
// the file parameter is joined straight onto the folder — traversal lives here
$path = $base . '/' . $file;
if (!is_file($path)) { http_response_code(404); layout_head('Download'); echo '<h1>File not found</h1>'; layout_foot(); return; }
$content = file_get_contents($path);
if (strpos($file, '..') !== false && (strpos($content, 'NORDKART_') !== false || strpos($content, 'DB_PASS') !== false || strpos($content, '<?php') !== false)) rs_pass('path-traversal');
nk_log('DOWNLOAD ' . $file);
header('Content-Type: text/plain');
echo $content;
