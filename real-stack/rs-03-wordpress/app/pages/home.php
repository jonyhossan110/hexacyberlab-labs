<?php
$posts = db()->query("SELECT p.*, u.name AS author_name, u.slug AS author_slug FROM posts p JOIN users u ON u.id = p.author_id WHERE p.status = 'publish' ORDER BY p.created DESC")->fetchAll(PDO::FETCH_ASSOC);
layout_head('Home');
echo '<section class="hero"><h1>Slow travel, honest stories</h1><p>Guides written at walking pace by people who went — no listicles, no stock-photo itineraries.</p></section><div class="grid">';
foreach ($posts as $p) {
    echo '<a class="card" href="/post?slug=' . htmlspecialchars($p['slug']) . '"><h3>' . htmlspecialchars($p['title']) . '</h3><p>' . htmlspecialchars($p['excerpt']) . '</p><span class="muted">by <object><a href="/author/' . htmlspecialchars($p['author_slug']) . '">' . htmlspecialchars($p['author_name']) . '</a></object> · ' . $p['created'] . '</span></a>';
}
echo '</div>';
layout_foot();
