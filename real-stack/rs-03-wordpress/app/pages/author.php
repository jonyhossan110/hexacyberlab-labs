<?php
/* Author archive — /author/<slug>. Reached directly, or via the canonical
   redirect from /?author=N (which is where the enumeration test lives). */
$slug = $authorSlug ?? '';
$st = db()->prepare("SELECT * FROM users WHERE slug = ?");
$st->execute([$slug]);
$a = $st->fetch(PDO::FETCH_ASSOC);
layout_head($a ? $a['name'] : 'Author');
if (!$a) { echo '<h1>Author not found</h1>'; layout_foot(); return; }
echo '<h1>' . htmlspecialchars($a['name']) . '</h1>' .
'<p class="muted">' . htmlspecialchars(ucfirst($a['role'])) . ' · wanderpress.example profile slug: <code>' . htmlspecialchars($a['slug']) . '</code></p>' .
'<p>' . htmlspecialchars($a['bio']) . '</p><h2>Posts by ' . htmlspecialchars($a['name']) . '</h2>';
$posts = db()->query("SELECT * FROM posts WHERE author_id = " . (int)$a['id'] . " AND status = 'publish' ORDER BY created DESC")->fetchAll(PDO::FETCH_ASSOC);
if (!$posts) echo '<p class="muted">No posts yet.</p>';
foreach ($posts as $p) {
    echo '<div class="review"><a href="/post?slug=' . htmlspecialchars($p['slug']) . '"><b>' . htmlspecialchars($p['title']) . '</b></a><p class="muted">' . htmlspecialchars($p['excerpt']) . ' · ' . $p['created'] . '</p></div>';
}
layout_foot();
