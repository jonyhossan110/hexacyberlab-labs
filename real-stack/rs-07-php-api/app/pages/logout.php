<?php
session_destroy();
setcookie('hp_token', '', ['path' => '/', 'expires' => time() - 3600]);
header('Location: /');
