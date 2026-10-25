<?php
/* Lab progress — same shape as the core HexaCyberLab labs:
   progress.json { unlocked, tests:{id:true}, attempts:{}, completedAt } */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
function rs_progress_file(){ return LAB_ROOT . '/progress.json'; }
function rs_progress(){
    $f = rs_progress_file();
    if (is_file($f)) { $j = json_decode(file_get_contents($f), true); if (is_array($j)) return $j; }
    return ['unlocked' => true, 'tests' => new stdClass(), 'attempts' => new stdClass(), 'keyRevealed' => false, 'completedAt' => null];
}
function rs_save($p){ file_put_contents(rs_progress_file(), json_encode($p, JSON_PRETTY_PRINT)); }
function rs_tests_total(){ return 12; }
function rs_pass($id){
    $p = rs_progress();
    $tests = (array)$p['tests'];
    if (!empty($tests[$id])) return;
    $tests[$id] = true;
    $p['tests'] = $tests;
    if (count($tests) >= rs_tests_total() && empty($p['completedAt'])) $p['completedAt'] = date('c');
    rs_save($p);
}
function rs_attempt($key){
    $p = rs_progress();
    $a = (array)$p['attempts'];
    $a[$key] = ($a[$key] ?? 0) + 1;
    $p['attempts'] = $a;
    rs_save($p);
    return $a[$key];
}
function rs_done_count(){ $p = rs_progress(); return count(array_filter((array)$p['tests'])); }
function rs_completion_code(){
    if (rs_done_count() < rs_tests_total()) return null;
    return 'RS01-' . strtoupper(substr(hash('sha256', 'rs-01-php:nordkart'), 0, 10));
}
