<?php
function e($v){ return htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8'); }
function csrf_token(){ return $_SESSION['_token'] ?? ''; }
function csrf_field(){ return '<input type="hidden" name="_token" value="' . e(csrf_token()) . '">'; }
function redirect_to($url){ header('Location: ' . $url); exit; }
function money($v){ return '€' . number_format((float)$v, 2); }
