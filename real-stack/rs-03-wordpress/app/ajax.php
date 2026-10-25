<?php
/* wp-admin/admin-ajax.php — the one URL every WordPress-style plugin hangs
   its actions on. Actions are dispatched by name, exactly like the real
   thing. What each action checks (or forgets to check) is up to the plugin. */
$action = $_GET['action'] ?? ($_POST['action'] ?? '');
if ($action === 'hc_search_messages') {
    if (!current_user()) {
        header('Content-Type: application/json');
        http_response_code(401);
        echo json_encode(['error' => 'login required']);
        exit;
    }
    hc_ajax_search_messages(); // Hexa Contact plugin — see its file for the problems
}
header('Content-Type: text/plain');
echo '0';
