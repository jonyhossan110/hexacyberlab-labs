<?php
/* HexaPay Ltd — API configuration.
   Written for the MVP in a hurry; several "temporary" choices shipped. */
return [
    'app_name'   => 'HexaPay',
    'tagline'    => 'Payments and wallets for small teams',
    'debug'      => true,                 // verbose API errors left on in production
    'db_file'    => __DIR__ . '/../data.sqlite',
    'db_user'    => 'hexapay_api',
    'db_pass'    => 'Vault-Key-2024!',    // legacy: SQLite needs no password, this is still here
    'token_recipe' => 'hp_' . 'md5(email)', // documented in an old onboarding note — see app/api.php
    'otp_length' => 4,
    'currency'   => '€',
];
