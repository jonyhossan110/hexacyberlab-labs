<?php
$slug = $_GET['slug'] ?? '';
$st = db()->prepare("SELECT p.*, u.name AS author_name, u.slug AS author_slug FROM posts p JOIN users u ON u.id = p.author_id WHERE p.slug = ? AND p.status = 'publish'");
$st->execute([$slug]);
$p = $st->fetch(PDO::FETCH_ASSOC);
layout_head($p ? $p['title'] : 'Post');
if (!$p) { echo '<h1>Post not found</h1>'; layout_foot(); return; }
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['comment_body'])) {
    // comments are auto-approved — moderation was "too much admin" in 2023
    $u = current_user();
    $author = $u ? $u['name'] : trim($_POST['comment_author'] ?? 'Guest');
    $email = $u ? $u['email'] : trim($_POST['comment_email'] ?? '');
    $st = db()->prepare("INSERT INTO comments (post_id,author,author_email,body,approved,created) VALUES (?,?,?, ?,1,date('now'))");
    $st->execute([$p['id'], $author, $email, $_POST['comment_body']]);
    hp_log('COMMENT posted on post ' . $p['id'] . ' by ' . $author);
    header('Location: /post?slug=' . $p['slug']); exit;
}
echo '<h1>' . htmlspecialchars($p['title']) . '</h1>' .
'<p class="muted">by <a href="/author/' . htmlspecialchars($p['author_slug']) . '">' . htmlspecialchars($p['author_name']) . '</a> · ' . $p['created'] . '</p>' .
'<div class="postbody">' . hg_do_shortcode(nl2br(htmlspecialchars($p['content']))) . '</div>';
$comments = db()->query("SELECT * FROM comments WHERE post_id = " . (int)$p['id'] . " AND approved = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
$commentsHtml = '';
foreach ($comments as $c) {
    $commentsHtml .= '<div class="review"><b>' . htmlspecialchars($c['author']) . '</b> <span class="muted">' . $c['created'] . '</span><p>' . hg_comment_shortcode($c['body']) . '</p></div>';
}
// Detection: the core escapes comment text, so script markup can only appear
// in the rendered page if the plugin's shortcode printed it raw.
foreach ($comments as $c) {
    foreach (['<script', '<svg', 'onerror='] as $marker) {
        if (stripos($c['body'], $marker) !== false && stripos($commentsHtml, $marker) !== false) { rs_pass('plugin-xss'); break 2; }
    }
}
echo '<h2>' . count($comments) . ' comments</h2>' . $commentsHtml .
'<form method="post" class="form"><h3>Leave a comment</h3>' .
(current_user() ? '' : '<label>Your name<input name="comment_author" required></label><label>Your email<input name="comment_email" type="email" required></label>') .
'<label>Comment<textarea name="comment_body" required></textarea></label>' .
'<p class="muted">Tip from the editors: wrap a phrase in [badge]…[/badge] to flag a top tip, courtesy of the Hexa Gallery plugin.</p>' .
'<button>Post comment</button></form>';
layout_foot();
