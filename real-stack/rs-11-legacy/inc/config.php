<?php
/* BrightTravel — config.php
   Written in 2009, edited by hand ever since. If you are reading this file
   through the website, something has gone very wrong. */
define('BT_LEGACY_MARKER', 'BT-CONFIG-SECRET-7f3a9c'); // the canary: this string must never be visible from the web
return [
    'app_name'    => 'BrightTravel',
    'tagline'     => 'Sunshine holidays since 2009',
    'debug'       => true,                    // display_errors on, in production, since forever
    'db_file'     => __DIR__ . '/../data.sqlite',
    'db_host'     => 'localhost',             // legacy: the site ran on MySQL until the 2013 port
    'db_user'     => 'brighttravel',
    'db_pass'     => 'Sunny-Travel-DB-2012!', // database master password — still valid everywhere
    'admin_email' => 'bookings@brighttravel.example',
    'est'         => 2009,
];
