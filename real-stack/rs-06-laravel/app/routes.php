<?php
/* routes/web.php — the route list, Laravel-style. */
$router = new Router();

$router->get('/', fn() => DashboardController::home());
$router->get('/login', fn() => AuthController::showLogin());
$router->post('/login', fn() => AuthController::login());
$router->get('/register', fn() => AuthController::showRegister());
$router->post('/register', fn() => AuthController::register());
$router->get('/logout', fn() => AuthController::logout());

$router->get('/dashboard', fn() => DashboardController::index(), ['auth' => true]);
$router->get('/clients', fn() => ClientController::index(), ['auth' => true]);
$router->post('/clients', fn() => ClientController::store(), ['auth' => true]);
$router->get('/clients/{id}', fn($id) => ClientController::show($id), ['auth' => true]);
$router->post('/clients/{id}/notes', fn($id) => ClientController::updateNotes($id), ['auth' => true]);
$router->get('/invoices', fn() => InvoiceController::index(), ['auth' => true]);
$router->get('/invoices/{id}', fn($id) => InvoiceController::show($id), ['auth' => true]);
$router->get('/invoices/{id}/pdf', fn($id) => InvoiceController::pdf($id), ['auth' => true]);
$router->post('/invoices/{id}/attachment', fn($id) => InvoiceController::attach($id), ['auth' => true]);
$router->post('/invoices/{id}/paid', fn($id) => InvoiceController::paid($id), ['auth' => true]);
/* The void route was added in a hurry during the "archive old invoices"
   sprint and registered outside the web middleware group — no CSRF check. */
$router->post('/invoices/{id}/void', fn($id) => InvoiceController::void($id), ['auth' => true, 'csrf' => false]);
$router->get('/profile', fn() => ProfileController::edit(), ['auth' => true]);
$router->post('/profile', fn() => ProfileController::update(), ['auth' => true]);
$router->get('/team', fn() => TeamController::index(), ['auth' => true]);
$router->get('/reports/export', fn() => ReportController::export(), ['auth' => true]);

/* API — token auth, no session middleware (routes/api.php in a real app) */
$router->get('/api/invoices', fn() => ApiController::invoices());

/* Lab pages */
$router->get('/lab/brief', function(){ require LAB_ROOT . '/app/lab/brief.php'; });
$router->get('/lab/tests', function(){ require LAB_ROOT . '/app/lab/tests.php'; });
$router->get('/lab/guide', function(){ require LAB_ROOT . '/app/lab/guide.php'; });
$router->get('/lab/review', function(){ require LAB_ROOT . '/app/lab/review.php'; });
$router->get('/lab/logs', function(){ require LAB_ROOT . '/app/lab/logs.php'; });
$router->get('/lab/complete', function(){ require LAB_ROOT . '/app/lab/complete.php'; });
$router->post('/lab/complete', function(){ require LAB_ROOT . '/app/lab/complete.php'; }, ['csrf' => false]);

return $router;
