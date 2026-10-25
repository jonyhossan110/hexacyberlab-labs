<?php
/* NordKart AS — application configuration.
   Copied from the production server in 2023 and never cleaned up. */
return [
    'app_name'   => 'NordKart',
    'tagline'    => 'Scandinavian home goods, delivered',
    'debug'      => true,                 // TODO: turn off before launch (never done)
    'db_file'    => __DIR__ . '/../data.sqlite',
    'db_user'    => 'nordkart_app',
    'db_pass'    => 'Fjord-Db-2023!',     // legacy: the app uses SQLite now, this is unused (but still here)
    'admin_email'=> 'ingrid@nordkart.example',
    'promo_hash' => '0e830400451993494058024219903391', // md5 of the staff promo phrase
    'currency'   => '€',
];
