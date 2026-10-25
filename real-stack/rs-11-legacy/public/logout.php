<?php
require_once __DIR__ . '/../inc/common.php';
session_destroy();
header('Location: /index.php');
