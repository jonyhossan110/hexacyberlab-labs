<?php
/* HexaBilling configuration — built from .env the way Laravel's config/*.php
   files read env(). APP_DEBUG=true in production is one of this app's sins. */
function hb_env(){
    static $env = null;
    if ($env !== null) return $env;
    $env = [];
    foreach (file(LAB_ROOT . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if ($line[0] === '#' || strpos($line, '=') === false) continue;
        [$k, $v] = explode('=', $line, 2);
        $env[trim($k)] = trim($v);
    }
    return $env;
}
function cfg($key = null){
    static $c = null;
    if ($c === null) {
        $e = hb_env();
        $c = [
            'app_name'  => $e['APP_NAME'] ?? 'HexaBilling',
            'debug'     => ($e['APP_DEBUG'] ?? 'false') === 'true',
            'app_key'   => $e['APP_KEY'] ?? '',
            'db_file'   => LAB_ROOT . '/data.sqlite',
            'db_user'   => $e['DB_USERNAME'] ?? '',
            'db_pass'   => $e['DB_PASSWORD'] ?? '',
            'mail_pass' => $e['MAIL_PASSWORD'] ?? '',
            'currency'  => '€',
        ];
    }
    return $key === null ? $c : ($c[$key] ?? null);
}
