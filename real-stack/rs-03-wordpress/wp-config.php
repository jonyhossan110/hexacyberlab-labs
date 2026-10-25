<?php
/* WanderPress wp-config.php — HexaPress (WordPress-style) configuration.
   Committed to the repo in 2022 "just to get the site moved". Nobody has
   opened it since. Attackers open files like this one first. */
define('DB_NAME', 'wanderpress');
define('DB_USER', 'wanderpress_app');
define('DB_PASSWORD', 'FjordPress-Db-2026!');
define('DB_HOST', 'db.wanderpress.internal');
define('DB_CHARSET', 'utf8mb4');
define('WP_DEBUG', true);              // left on after a 2023 troubleshooting session
define('WP_VERSION', '6.4.2');
/* Authentication keys and salts — unchanged since the site launched. */
define('AUTH_KEY', 'wanderpress-salt-do-not-share');
define('SECURE_AUTH_KEY', 'wanderpress-secure-salt-do-not-share');
$table_prefix = 'wp_';
