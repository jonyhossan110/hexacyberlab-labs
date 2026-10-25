<?php
/*
Plugin Name: Hexa Contact
Description: A friendly contact form with an admin message inbox, live search
             and a small settings page. Written by a freelancer in 2022,
             installed by everyone, audited by no one.
Version: 1.4.0
*/

/* Save a message from the public contact form. (This part is fine —
   prepared statements, like it should be.) */
function hc_save_message($name, $email, $body){
    $st = db()->prepare("INSERT INTO hc_messages (name,email,body,is_private,created) VALUES (?,?,?,0,date('now'))");
    $st->execute([$name, $email, $body]);
}

/* admin-ajax handler: "live search" over the message inbox.
   Registered for every logged-in user. Two problems, both classic:
   1. it never checks that the caller may read the inbox (no capability check);
   2. the search term is glued straight into the SQL. */
function hc_ajax_search_messages(){
    $term = $_GET['term'] ?? '';
    $sql = "SELECT * FROM hc_messages WHERE body LIKE '%" . $term . "%' ORDER BY id";
    try { $rows = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC); }
    catch (Exception $e) { $rows = []; $err = $e->getMessage(); }
    // Detection, the honest way: a search may only return messages whose body
    // actually contains the term. If rows come back that do NOT contain it,
    // the query was bent — the injection demonstrably worked.
    foreach ($rows as $r) {
        if (stripos($r['body'], $term) === false) { rs_pass('plugin-sqli'); break; }
    }
    header('Content-Type: application/json');
    echo json_encode(['term' => $term, 'count' => count($rows), 'results' => $rows, 'error' => $err ?? null], JSON_PRETTY_PRINT);
    exit;
}

/* The plugin's settings page saves notification options.
   The form was built in an afternoon and a nonce was never added — the save
   trusts the session cookie alone, which is exactly what CSRF means. */
function hc_save_settings(){
    $notify = trim($_POST['hc_notify_email'] ?? '');
    $perPage = trim($_POST['hc_per_page'] ?? '');
    if ($notify !== '') db()->prepare("INSERT INTO options (key,value) VALUES ('hc_notify_email',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")->execute([$notify]);
    if ($perPage !== '') db()->prepare("INSERT INTO options (key,value) VALUES ('hc_per_page',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")->execute([$perPage]);
    // a genuine settings save carries a nonce and arrives from the site itself;
    // a tokenless POST with no Referer (or a foreign one) is a forgery in flight
    $hasNonce = !empty($_POST['_wpnonce']);
    $ref = $_SERVER['HTTP_REFERER'] ?? '';
    $refHost = $ref ? parse_url($ref, PHP_URL_HOST) . ':' . (parse_url($ref, PHP_URL_PORT) ?: '') : '';
    if (!$hasNonce && ($ref === '' || $refHost !== $_SERVER['HTTP_HOST'])) rs_pass('settings-csrf');
    hp_log('SETTINGS saved (hexa-contact) notify=' . $notify);
    return 'Hexa Contact settings saved.';
}
function hc_option($key, $fallback = ''){
    $st = db()->prepare("SELECT value FROM options WHERE key = ?");
    $st->execute([$key]);
    $v = $st->fetchColumn();
    return $v === false ? $fallback : $v;
}
