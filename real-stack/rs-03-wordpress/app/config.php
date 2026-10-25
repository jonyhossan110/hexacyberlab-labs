<?php
/* WanderPress — application configuration.
   The WordPress-style wp-config.php sits at the lab root (go and look at it);
   this file is the running app's own config. */
return [
    'site_name' => 'WanderPress',
    'tagline'   => 'Slow travel, honest stories',
    'version'   => '6.4.2',              // HexaPress core version — also in the generator meta and readme.html
    'debug'     => true,                 // WP_DEBUG left on in production (see wp-content/debug.log)
    'db_file'   => __DIR__ . '/../data.sqlite',
];
