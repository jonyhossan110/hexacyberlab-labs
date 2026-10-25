<?php
/* Database layer. PDO + SQLite so the API runs anywhere with zero setup.
   Passwords are stored as bare SHA-256 — a fast hash, chosen because
   "bcrypt was slow in the demo". That choice is part of the audit. */
function db(){
    static $pdo = null;
    if ($pdo) return $pdo;
    $cfg = require __DIR__ . '/config.php';
    $fresh = !is_file($cfg['db_file']);
    $pdo = new PDO('sqlite:' . $cfg['db_file']);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    if ($fresh) hp_seed($pdo);
    return $pdo;
}
function hp_seed($pdo){
    $pdo->exec("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT, phone TEXT, phone_verified INTEGER DEFAULT 0, created TEXT)");
    $pdo->exec("CREATE TABLE accounts (id INTEGER PRIMARY KEY, user_id INTEGER, label TEXT, balance REAL, currency TEXT, opened TEXT)");
    $pdo->exec("CREATE TABLE tokens (token TEXT PRIMARY KEY, user_id INTEGER, issued_via TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE transactions (id INTEGER PRIMARY KEY, from_account INTEGER, to_account INTEGER, amount REAL, note TEXT, created TEXT)");
    $pdo->exec("CREATE TABLE transfers (id INTEGER PRIMARY KEY, from_account INTEGER, to_account INTEGER, amount REAL, status TEXT, created TEXT, executed_at TEXT)");
    $pdo->exec("CREATE TABLE otp_challenges (id INTEGER PRIMARY KEY, user_id INTEGER, code TEXT, attempts INTEGER DEFAULT 0, verified INTEGER DEFAULT 0, created TEXT)");
    $pdo->exec("CREATE TABLE webhooks (id INTEGER PRIMARY KEY, user_id INTEGER, url TEXT, active INTEGER DEFAULT 1, last_status INTEGER, last_body TEXT, last_checked TEXT, created TEXT)");
    $users = [
        ['Priya Nair','priya.nair@example.in','Monsoon!24','customer','+91 98200 41173',4820.55,'Everyday wallet'],
        ['Diego Fuentes','diego.fuentes@example.es','Andes#2023','customer','+34 612 48 90 21',1930.20,'Everyday wallet'],
        ['Nadia Rahman','nadia.rahman@example.com','Cedar!Pass8','customer','+1 415 555 0132',764.90,'Everyday wallet'],
        ['Tom Becker','tom.becker@example.de','Alpen#77','customer','+49 170 555 884',2210.00,'Business wallet'],
        ['Yuki Tanaka','yuki.tanaka@example.jp','Sakura!2024','customer','+81 90 5550 1173',9350.75,'Savings wallet'],
        ['Omar Haddad','omar.haddad@example.ae','Dune#Sun5','customer','+971 50 555 0192',640.30,'Everyday wallet'],
        ['Elena Petrova','elena.petrova@example.com','Volga!19','customer','+7 916 555 0147',3125.60,'Everyday wallet'],
        ['Marcus Lee','marcus.lee@example.sg','Harbour#3','customer','+65 8555 0198',1280.45,'Business wallet'],
        ['Ingrid Voss','ingrid.voss@example.no','Fjord!Ops22','admin','+47 412 55 903',15000.00,'Ops float'],
        ['Sam Whitfield','sam.whitfield@example.co.uk','Thames!8','customer','+44 7700 555214',452.10,'Everyday wallet'],
    ];
    $st = $pdo->prepare("INSERT INTO users (name,email,password_hash,role,phone,created) VALUES (?,?,?,?,?,date('now'))");
    $sa = $pdo->prepare("INSERT INTO accounts (user_id,label,balance,currency,opened) VALUES (?,?,?,'EUR',date('now'))");
    foreach ($users as $u) {
        $st->execute([$u[0], $u[1], hash('sha256', $u[2]), $u[3], $u[4]]);
        $sa->execute([$pdo->lastInsertId(), $u[6], $u[5]]);
    }
    $tx = [
        [1,3,120.00,'Rent split — October','2026-10-02'],
        [3,1,45.50,'Groceries payback','2026-10-03'],
        [5,2,890.00,'Invoice #1042 — design work','2026-10-05'],
        [4,5,129.99,'Concert tickets','2026-10-06'],
        [2,8,60.00,'Coffee fund top-up','2026-10-07'],
        [7,3,210.75,'Freelance payout — edits','2026-10-09'],
        [9,10,1500.00,'Ops float top-up','2026-10-10'],
        [6,4,32.40,'Taxi split','2026-10-11'],
        [8,6,475.00,'Rent — November deposit','2026-10-12'],
        [10,7,88.20,'Book club kitty','2026-10-13'],
        [1,5,250.00,'Birthday gift','2026-10-14'],
        [3,9,19.99,'Support refund','2026-10-15'],
    ];
    $st = $pdo->prepare("INSERT INTO transactions (from_account,to_account,amount,note,created) VALUES (?,?,?,?,?)");
    foreach ($tx as $t) $st->execute($t);
}
function hp_account_of($userId){
    $st = db()->prepare("SELECT * FROM accounts WHERE user_id = ? ORDER BY id LIMIT 1");
    $st->execute([$userId]);
    return $st->fetch(PDO::FETCH_ASSOC) ?: null;
}
function hp_user_public($u){
    /* The "public" profile the API returns. It returns a great deal more
       than any client needs — that is one of the scored tests. */
    $st = db()->prepare("SELECT token, issued_via FROM tokens WHERE user_id = ? LIMIT 1");
    $st->execute([$u['id']]);
    $tok = $st->fetch(PDO::FETCH_ASSOC);
    return [
        'id' => (int)$u['id'], 'display_name' => $u['name'], 'email' => $u['email'],
        'role' => $u['role'], 'phone' => $u['phone'], 'phone_verified' => (bool)$u['phone_verified'],
        'password_hash' => $u['password_hash'],
        'api_token' => $tok ? $tok['token'] : null,
        'created' => $u['created'],
    ];
}
