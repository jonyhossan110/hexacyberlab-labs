<?php
/* Framework bootstrap — the public/index.php of a Laravel app does exactly
   this: pull in the autoloader and hand the request to the router. */
if (!defined('LAB_ROOT')) define('LAB_ROOT', dirname(__DIR__));
require_once LAB_ROOT . '/app/progress.php';
require_once LAB_ROOT . '/app/log.php';
require_once LAB_ROOT . '/app/config.php';
require_once LAB_ROOT . '/app/db.php';
require_once LAB_ROOT . '/app/Router.php';
require_once LAB_ROOT . '/app/View.php';
require_once LAB_ROOT . '/app/Model.php';
require_once LAB_ROOT . '/app/Models/User.php';
require_once LAB_ROOT . '/app/Models/Client.php';
require_once LAB_ROOT . '/app/Models/Invoice.php';
require_once LAB_ROOT . '/app/helpers.php';
require_once LAB_ROOT . '/app/auth.php';
require_once LAB_ROOT . '/app/layout.php';
require_once LAB_ROOT . '/app/Controllers/AuthController.php';
require_once LAB_ROOT . '/app/Controllers/DashboardController.php';
require_once LAB_ROOT . '/app/Controllers/ClientController.php';
require_once LAB_ROOT . '/app/Controllers/InvoiceController.php';
require_once LAB_ROOT . '/app/Controllers/ProfileController.php';
require_once LAB_ROOT . '/app/Controllers/TeamController.php';
require_once LAB_ROOT . '/app/Controllers/ApiController.php';
require_once LAB_ROOT . '/app/Controllers/ReportController.php';
