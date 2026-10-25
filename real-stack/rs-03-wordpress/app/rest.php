<?php
/* The REST API — /wp-json/. Modeled on the real wp/v2 routes.
   The users route is where this site overshares: a stock WordPress exposes
   ids, names and slugs here (already enough for enumeration), but this
   build helpfully includes every user's EMAIL and role as well, to anyone,
   logged in or not. */
header('Content-Type: application/json');
if ($path === '/wp-json' || $path === '/wp-json/') {
    echo json_encode(['name' => 'WanderPress', 'description' => 'Slow travel, honest stories',
        'routes' => ['/wp-json/wp/v2/posts', '/wp-json/wp/v2/users']], JSON_PRETTY_PRINT);
    return;
}
if ($path === '/wp-json/wp/v2/users') {
    $users = db()->query("SELECT id, name, slug, email, role, bio FROM users ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
    $out = [];
    foreach ($users as $x) {
        $out[] = ['id' => (int)$x['id'], 'name' => $x['name'], 'slug' => $x['slug'],
                  'email' => $x['email'], 'roles' => [$x['role']],
                  'description' => $x['bio'], 'link' => '/author/' . $x['slug']];
    }
    // the exposure is the response itself: private emails, served anonymously
    hp_log('REST /wp-json/wp/v2/users served ' . count($out) . ' user records incl. emails');
    rs_pass('rest-exposure');
    echo json_encode($out, JSON_PRETTY_PRINT);
    return;
}
if ($path === '/wp-json/wp/v2/posts') {
    $posts = db()->query("SELECT id, title, slug, excerpt, created FROM posts WHERE status = 'publish' ORDER BY created DESC")->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($posts, JSON_PRETTY_PRINT);
    return;
}
http_response_code(404);
echo json_encode(['code' => 'rest_no_route', 'message' => 'No route was found matching the URL and request method.']);
